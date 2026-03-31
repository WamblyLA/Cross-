from __future__ import annotations

import json
import queue
import re
import sys
import threading
import traceback
from dataclasses import dataclass, field
from typing import Any

from jupyter_client import KernelManager
from jupyter_client.kernelspec import KernelSpecManager

READY_TIMEOUT_SECONDS = 15
MESSAGE_POLL_TIMEOUT_SECONDS = 0.2
ANSI_ESCAPE_RE = re.compile(r"\x1B(?:\][^\x07]*(?:\x07|\x1b\\)|[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
MOJIBAKE_PAIR_RE = re.compile(r"[\u0420\u0421][\u0080-\u04ff]")


def configure_stdio() -> None:
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)


write_lock = threading.Lock()
sessions_lock = threading.RLock()


def send_message(message: dict[str, Any]) -> None:
    payload = json.dumps(message, ensure_ascii=False)
    with write_lock:
        sys.stdout.write(payload)
        sys.stdout.write("\n")
        sys.stdout.flush()


def send_response(request_id: str, ok: bool, result: Any = None, error: str | None = None) -> None:
    message: dict[str, Any] = {
        "type": "response",
        "id": request_id,
        "ok": ok,
    }

    if ok:
        message["result"] = result
    else:
        message["error"] = {"message": error or "Bridge request failed."}

    send_message(message)


def send_event(event: dict[str, Any]) -> None:
    send_message({"type": "event", "event": event})


def strip_ansi_sequences(value: str) -> str:
    return ANSI_ESCAPE_RE.sub("", value)


def maybe_fix_utf8_mojibake(value: str) -> str:
    if not value:
        return value

    original_score = len(MOJIBAKE_PAIR_RE.findall(value))
    if original_score < 2:
        return value

    try:
        repaired = value.encode("cp1251").decode("utf-8")
    except UnicodeError:
        return value

    repaired_score = len(MOJIBAKE_PAIR_RE.findall(repaired))
    return repaired if repaired_score < original_score else value


def sanitize_text_output(value: str) -> str:
    without_ansi = strip_ansi_sequences(value).replace("\r\n", "\n")
    return maybe_fix_utf8_mojibake(without_ansi)


def normalize_text(value: Any) -> str:
    if isinstance(value, list):
        return sanitize_text_output("".join(str(part) for part in value))
    if value is None:
        return ""
    return sanitize_text_output(str(value))


def normalize_stream_output(content: dict[str, Any]) -> dict[str, Any]:
    return {
        "output_type": "stream",
        "name": "stderr" if content.get("name") == "stderr" else "stdout",
        "text": normalize_text(content.get("text")),
    }


def normalize_error_output(content: dict[str, Any]) -> dict[str, Any]:
    traceback_lines = content.get("traceback")
    if isinstance(traceback_lines, list):
        normalized_traceback = [sanitize_text_output(str(line)) for line in traceback_lines]
    else:
        normalized_traceback = []

    return {
        "output_type": "error",
        "ename": sanitize_text_output(str(content.get("ename") or "Error")),
        "evalue": sanitize_text_output(str(content.get("evalue") or "")),
        "traceback": normalized_traceback,
    }


def normalize_rich_output(msg_type: str, content: dict[str, Any]) -> dict[str, Any]:
    return {
        "output_type": msg_type,
        "data": content.get("data") if isinstance(content.get("data"), dict) else {},
        "metadata": content.get("metadata") if isinstance(content.get("metadata"), dict) else {},
        "execution_count": content.get("execution_count")
        if isinstance(content.get("execution_count"), int)
        else None,
    }


def append_output(outputs: list[dict[str, Any]], output: dict[str, Any]) -> int:
    if (
        outputs
        and output.get("output_type") == "stream"
        and outputs[-1].get("output_type") == "stream"
        and outputs[-1].get("name") == output.get("name")
    ):
        outputs[-1]["text"] = f"{outputs[-1].get('text', '')}{output.get('text', '')}"
        return len(outputs) - 1

    outputs.append(output)
    return len(outputs) - 1


def is_keyboard_interrupt(outputs: list[dict[str, Any]], reply_content: dict[str, Any] | None) -> bool:
    if reply_content and str(reply_content.get("ename") or "") == "KeyboardInterrupt":
        return True

    for output in outputs:
        if output.get("output_type") != "error":
            continue

        if output.get("ename") == "KeyboardInterrupt":
            return True

    return False


def derive_execution_status(outputs: list[dict[str, Any]], reply_content: dict[str, Any] | None) -> str:
    status = str((reply_content or {}).get("status") or "ok")

    if status == "ok":
        return "ok"

    if is_keyboard_interrupt(outputs, reply_content):
        return "interrupted"

    return "error"


def extract_display_id(content: dict[str, Any]) -> str | None:
    transient = content.get("transient")

    if isinstance(transient, dict):
        display_id = transient.get("display_id")
        if isinstance(display_id, str) and display_id.strip():
            return display_id

    return None


def build_kernel_descriptor(name: str, payload: dict[str, Any]) -> dict[str, Any]:
    spec = payload.get("spec") if isinstance(payload.get("spec"), dict) else {}
    argv = spec.get("argv") if isinstance(spec.get("argv"), list) else []
    executable_path = str(argv[0]) if argv else None
    display_name = str(spec.get("display_name") or name)
    language = spec.get("language")

    return {
        "id": name,
        "name": name,
        "displayName": display_name,
        "language": str(language) if language else None,
        "resourceDir": payload.get("resource_dir"),
        "executablePath": executable_path,
        "interruptMode": spec.get("interrupt_mode")
        if isinstance(spec.get("interrupt_mode"), str)
        else None,
        "isRecommended": str(language or "").lower() in {"python", "ipython"},
    }


@dataclass
class NotebookSession:
    runtime_id: str
    kernel_id: str
    notebook_path: str
    working_directory: str
    launch_kind: str = "kernelspec"
    kernel_name: str | None = None
    interpreter_path: str | None = None
    km: KernelManager | None = None
    kc: Any = None
    is_executing: bool = False
    display_registry: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    kernel_display_name: str | None = None
    language_info_name: str | None = None
    lock: threading.RLock = field(default_factory=threading.RLock)

    def create_kernel_manager(self) -> KernelManager:
        if self.launch_kind == "interpreter":
            if not self.interpreter_path:
                raise RuntimeError("Не указан Python-интерпретатор для запуска ядра.")

            manager = KernelManager()
            manager.kernel_cmd = [
                self.interpreter_path,
                "-m",
                "ipykernel_launcher",
                "-f",
                "{connection_file}",
            ]
            return manager

        return KernelManager(kernel_name=self.kernel_name or self.kernel_id)

    def start(self) -> dict[str, Any]:
        self.km = self.create_kernel_manager()
        self.km.start_kernel(cwd=self.working_directory)
        self.kc = self.km.blocking_client()
        self.kc.start_channels()
        self.kc.wait_for_ready(timeout=READY_TIMEOUT_SECONDS)
        info = self.request_kernel_info()
        if not self.kernel_display_name:
            self.kernel_display_name = str(info.get("implementation") or self.kernel_id)
        language_info = info.get("language_info")
        if isinstance(language_info, dict) and isinstance(language_info.get("name"), str):
            self.language_info_name = language_info.get("name")

        return {
            "runtimeId": self.runtime_id,
            "kernelId": self.kernel_id,
            "kernelDisplayName": self.kernel_display_name or self.kernel_id,
            "languageInfoName": self.language_info_name,
            "status": "idle",
            "detail": "Ядро готово.",
        }

    def request_kernel_info(self) -> dict[str, Any]:
        request_id = self.kc.kernel_info()

        while True:
            reply = self.kc.get_shell_msg(timeout=READY_TIMEOUT_SECONDS)
            parent_id = (
                reply.get("parent_header", {}).get("msg_id")
                if isinstance(reply.get("parent_header"), dict)
                else None
            )

            if parent_id == request_id:
                content = reply.get("content")
                return content if isinstance(content, dict) else {}

    def restart(self) -> dict[str, Any]:
        if self.is_executing:
            raise RuntimeError(
                "Нельзя перезапустить ядро во время выполнения ячейки."
            )

        self.display_registry.clear()

        if self.kc is not None:
            self.kc.stop_channels()

        if self.km is None:
            raise RuntimeError("Kernel manager is not initialized.")

        self.km.restart_kernel(now=True)
        self.kc = self.km.blocking_client()
        self.kc.start_channels()
        self.kc.wait_for_ready(timeout=READY_TIMEOUT_SECONDS)
        info = self.request_kernel_info()
        language_info = info.get("language_info")
        if isinstance(language_info, dict) and isinstance(language_info.get("name"), str):
            self.language_info_name = language_info.get("name")

        return {
            "runtimeId": self.runtime_id,
            "kernelId": self.kernel_id,
            "kernelDisplayName": self.kernel_display_name or self.kernel_id,
            "languageInfoName": self.language_info_name,
            "status": "idle",
            "detail": "Ядро перезапущено.",
        }

    def interrupt(self) -> None:
        if self.km is None:
            raise RuntimeError("Kernel manager is not initialized.")
        self.km.interrupt_kernel()

    def shutdown(self) -> None:
        try:
            if self.kc is not None:
                self.kc.stop_channels()
        finally:
            if self.km is not None:
                self.km.shutdown_kernel(now=True)


sessions: dict[str, NotebookSession] = {}


def list_kernels() -> dict[str, Any]:
    manager = KernelSpecManager()
    specs = manager.get_all_specs()
    kernels = [build_kernel_descriptor(name, payload) for name, payload in specs.items()]
    kernels.sort(
        key=lambda item: (0 if item.get("isRecommended") else 1, item.get("displayName") or item["name"])
    )

    diagnostics: list[dict[str, Any]] = []
    if not kernels:
        diagnostics.append(
            {
                "source": "kernel-discovery",
                "severity": "warn",
                "message": "На этом компьютере не найдено ни одного Jupyter kernelspec.",
            }
        )

    return {
        "kernels": kernels,
        "diagnostics": diagnostics,
    }


def get_session(runtime_id: str) -> NotebookSession:
    with sessions_lock:
        session = sessions.get(runtime_id)

    if session is None:
        raise RuntimeError("Сессия ноутбука не запущена.")

    return session


def start_session(payload: dict[str, Any]) -> dict[str, Any]:
    runtime_id = str(payload.get("runtimeId") or "").strip()
    kernel_id = str(payload.get("kernelId") or "").strip()
    notebook_path = str(payload.get("notebookPath") or "").strip()
    working_directory = str(payload.get("workingDirectory") or "").strip()
    kernel_launch = payload.get("kernelLaunch") if isinstance(payload.get("kernelLaunch"), dict) else {}
    launch_kind = str(kernel_launch.get("launchKind") or "kernelspec").strip() or "kernelspec"
    kernel_name = str(kernel_launch.get("kernelName") or kernel_id).strip() or kernel_id
    display_name = str(kernel_launch.get("displayName") or kernel_id).strip() or kernel_id
    interpreter_path = str(kernel_launch.get("interpreterPath") or "").strip() or None

    if not runtime_id or not kernel_id or not notebook_path or not working_directory:
        raise RuntimeError(
            "Недостаточно данных для запуска kernel session."
        )

    if launch_kind not in {"kernelspec", "interpreter"}:
        raise RuntimeError(f"Неизвестный тип запуска ядра: {launch_kind}")

    if launch_kind == "interpreter" and not interpreter_path:
        raise RuntimeError("Для interpreter-ядра не указан Python-интерпретатор.")

    with sessions_lock:
        existing = sessions.get(runtime_id)

    if existing and existing.kernel_id == kernel_id:
        return {
            "session": {
                "runtimeId": runtime_id,
                "kernelId": kernel_id,
                "kernelDisplayName": existing.kernel_display_name or kernel_id,
                "languageInfoName": existing.language_info_name,
                "status": "idle",
                "detail": "Ядро уже подключено.",
            }
        }

    if existing:
        existing.shutdown()
        with sessions_lock:
            sessions.pop(runtime_id, None)

    session = NotebookSession(
        runtime_id=runtime_id,
        kernel_id=kernel_id,
        notebook_path=notebook_path,
        working_directory=working_directory,
        launch_kind=launch_kind,
        kernel_name=kernel_name,
        interpreter_path=interpreter_path,
        kernel_display_name=display_name,
    )
    session_info = session.start()

    with sessions_lock:
        sessions[runtime_id] = session

    return {
        "session": session_info,
    }


def handle_output_message(
    session: NotebookSession,
    cell_id: str,
    outputs: list[dict[str, Any]],
    message: dict[str, Any],
) -> None:
    msg_type = str(message.get("header", {}).get("msg_type") or "")
    content = message.get("content") if isinstance(message.get("content"), dict) else {}

    if msg_type == "stream":
        output = normalize_stream_output(content)
        append_output(outputs, output)
        send_event(
            {
                "type": "output",
                "runtimeId": session.runtime_id,
                "cellId": cell_id,
                "output": output,
            }
        )
        return

    if msg_type == "error":
        output = normalize_error_output(content)
        append_output(outputs, output)
        send_event(
            {
                "type": "output",
                "runtimeId": session.runtime_id,
                "cellId": cell_id,
                "output": output,
            }
        )
        return

    if msg_type in {"display_data", "execute_result"}:
        output = normalize_rich_output(msg_type, content)
        output_index = append_output(outputs, output)
        display_id = extract_display_id(content)

        if display_id:
            session.display_registry.setdefault(display_id, []).append(
                {
                    "cellId": cell_id,
                    "outputIndex": output_index,
                }
            )

        send_event(
            {
                "type": "output",
                "runtimeId": session.runtime_id,
                "cellId": cell_id,
                "output": output,
            }
        )
        return

    if msg_type == "update_display_data":
        display_id = extract_display_id(content)

        if not display_id:
            return

        output = normalize_rich_output("display_data", content)
        targets = session.display_registry.get(display_id, [])

        for target in targets:
            if target.get("cellId") != cell_id:
                continue

            output_index = target.get("outputIndex")
            if isinstance(output_index, int) and 0 <= output_index < len(outputs):
                outputs[output_index] = output

        send_event(
            {
                "type": "display-update",
                "runtimeId": session.runtime_id,
                "displayId": display_id,
                "targets": targets,
                "output": output,
            }
        )


def try_read_shell_reply(session: NotebookSession, request_id: str) -> dict[str, Any] | None:
    reply = session.kc.get_shell_msg(timeout=MESSAGE_POLL_TIMEOUT_SECONDS)
    parent_id = (
        reply.get("parent_header", {}).get("msg_id")
        if isinstance(reply.get("parent_header"), dict)
        else None
    )

    if parent_id != request_id:
        return None

    content = reply.get("content")
    return content if isinstance(content, dict) else {}


def execute_worker(request_id: str, payload: dict[str, Any]) -> None:
    runtime_id = str(payload.get("runtimeId") or "").strip()
    cell_id = str(payload.get("cellId") or "").strip()
    source = str(payload.get("source") or "")

    try:
        session = get_session(runtime_id)
    except Exception as error:
        send_response(request_id, False, error=str(error))
        return

    with session.lock:
        if session.is_executing:
            send_response(
                request_id,
                False,
                error="Ядро уже выполняет другую ячейку.",
            )
            return
        session.is_executing = True

    outputs: list[dict[str, Any]] = []
    execution_count: int | None = None

    send_event(
        {
            "type": "session-status",
            "runtimeId": runtime_id,
            "status": "busy",
            "detail": "Выполнение ячейки...",
        }
    )
    send_event(
        {
            "type": "execution-started",
            "runtimeId": runtime_id,
            "cellId": cell_id,
            "executionCount": None,
        }
    )

    try:
        execute_request_id = session.kc.execute(
            source,
            store_history=True,
            allow_stdin=False,
            stop_on_error=True,
        )
        reply_content: dict[str, Any] | None = None
        idle_received = False

        while True:
            if reply_content is None:
                try:
                    shell_reply = try_read_shell_reply(session, execute_request_id)
                    if shell_reply is not None:
                        reply_content = shell_reply
                        count = reply_content.get("execution_count")
                        execution_count = count if isinstance(count, int) else None
                except queue.Empty:
                    pass

            try:
                message = session.kc.get_iopub_msg(timeout=MESSAGE_POLL_TIMEOUT_SECONDS)
            except queue.Empty:
                message = None

            if message:
                parent_id = (
                    message.get("parent_header", {}).get("msg_id")
                    if isinstance(message.get("parent_header"), dict)
                    else None
                )
                msg_type = str(message.get("header", {}).get("msg_type") or "")
                content = message.get("content") if isinstance(message.get("content"), dict) else {}

                if msg_type == "status":
                    execution_state = str(content.get("execution_state") or "")

                    if parent_id == execute_request_id and execution_state == "idle":
                        idle_received = True

                    if execution_state in {"busy", "idle"}:
                        send_event(
                            {
                                "type": "session-status",
                                "runtimeId": runtime_id,
                                "status": execution_state,
                                "detail": "Ядро занято."
                                if execution_state == "busy"
                                else "Ядро готово.",
                            }
                        )
                    if parent_id != execute_request_id:
                        message = None
                        if reply_content is not None and idle_received:
                            break
                        continue

                if parent_id == execute_request_id and msg_type != "status":
                    handle_output_message(session, cell_id, outputs, message)

            if reply_content is not None and idle_received:
                break

        status = derive_execution_status(outputs, reply_content)
        result = {
            "status": status,
            "executionCount": execution_count,
            "outputs": outputs,
        }
        send_event(
            {
                "type": "execution-finished",
                "runtimeId": runtime_id,
                "cellId": cell_id,
                "status": status,
                "executionCount": execution_count,
                "outputs": outputs,
            }
        )
        send_event(
            {
                "type": "session-status",
                "runtimeId": runtime_id,
                "status": "idle",
                "detail": "Ядро готово.",
            }
        )
        send_response(request_id, True, result=result)
    except Exception as error:
        infrastructure_message = str(error) or "Kernel execution failed."
        send_event(
            {
                "type": "session-error",
                "runtimeId": runtime_id,
                "message": infrastructure_message,
            }
        )
        send_event(
            {
                "type": "session-status",
                "runtimeId": runtime_id,
                "status": "failed",
                "detail": infrastructure_message,
            }
        )
        send_response(request_id, False, error=infrastructure_message)
    finally:
        with session.lock:
            session.is_executing = False


def interrupt_session(payload: dict[str, Any]) -> dict[str, Any]:
    runtime_id = str(payload.get("runtimeId") or "").strip()
    session = get_session(runtime_id)
    session.interrupt()
    return {"success": True}


def restart_session(payload: dict[str, Any]) -> dict[str, Any]:
    runtime_id = str(payload.get("runtimeId") or "").strip()
    session = get_session(runtime_id)
    session_info = session.restart()
    return {"session": session_info}


def shutdown_session(payload: dict[str, Any]) -> dict[str, Any]:
    runtime_id = str(payload.get("runtimeId") or "").strip()

    with sessions_lock:
        session = sessions.pop(runtime_id, None)

    if session is None:
        return {"success": True}

    session.shutdown()
    return {"success": True}


def handle_request(request: dict[str, Any]) -> bool:
    request_id = request.get("id")
    command = request.get("command")
    payload = request.get("payload")

    if not isinstance(request_id, str) or not isinstance(command, str):
        return True

    request_payload = payload if isinstance(payload, dict) else {}

    try:
        if command == "list_kernels":
            send_response(request_id, True, result=list_kernels())
            return True

        if command == "start_session":
            send_response(request_id, True, result=start_session(request_payload))
            return True

        if command == "execute_cell":
            worker = threading.Thread(
                target=execute_worker,
                args=(request_id, request_payload),
                daemon=True,
            )
            worker.start()
            return True

        if command == "interrupt_session":
            send_response(request_id, True, result=interrupt_session(request_payload))
            return True

        if command == "restart_session":
            send_response(request_id, True, result=restart_session(request_payload))
            return True

        if command == "shutdown_session":
            send_response(request_id, True, result=shutdown_session(request_payload))
            return True

        send_response(request_id, False, error=f"Unknown command: {command}")
        return True
    except Exception as error:
        send_response(request_id, False, error=str(error))
        return True


def shutdown_all_sessions() -> None:
    with sessions_lock:
        active_sessions = list(sessions.values())
        sessions.clear()

    for session in active_sessions:
        try:
            session.shutdown()
        except Exception:
            pass


def main() -> int:
    configure_stdio()
    send_message({"type": "ready"})

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            continue

        if not handle_request(request):
            break

    shutdown_all_sessions()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        traceback.print_exc()
        raise
