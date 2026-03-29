import ast
import base64
import builtins
import contextlib
import io
import json
import os
import sys
import traceback

PROTOCOL_PREFIX = "__CROSSPP_NOTEBOOK__"
DISPLAY_CONTEXT = {"current": None}
ORIGINAL_IMPORT = builtins.__import__


class ProtocolWriter:
    def __init__(self, stream):
        self.stream = stream

    def emit(self, payload):
        message = json.dumps(payload, ensure_ascii=False, default=lambda value: repr(value))
        self.stream.write(f"{PROTOCOL_PREFIX}{message}\n")
        self.stream.flush()


WRITER = ProtocolWriter(sys.stdout)


class ExecutionContext:
    def __init__(self, command_id, cell_id, execution_count):
        self.command_id = command_id
        self.cell_id = cell_id
        self.execution_count = execution_count
        self.displayed_object_ids = set()
        self.capture_all_figures = False

    def emit_output(self, output):
        WRITER.emit(
            {
                "event": "output",
                "id": self.command_id,
                "cell_id": self.cell_id,
                "output": output,
            }
        )


class StreamCapture(io.TextIOBase):
    def __init__(self, stream_name):
        super().__init__()
        self.stream_name = stream_name

    def write(self, text):
        if not text:
            return 0

        context = DISPLAY_CONTEXT["current"]

        if context is not None:
            context.emit_output(
                {
                    "output_type": "stream",
                    "name": self.stream_name,
                    "text": text,
                }
            )

        return len(text)

    def flush(self):
        return None


def safe_repr(value):
    try:
        return repr(value)
    except Exception:
        return f"<{value.__class__.__name__}>"


def build_text_fallback_bundle(value):
    return {"text/plain": safe_repr(value)}, {}


def normalize_fromlist(fromlist):
    if fromlist is None:
        return ()

    if isinstance(fromlist, str):
        return (fromlist,)

    if isinstance(fromlist, (list, tuple, set)):
        return tuple(item for item in fromlist if isinstance(item, str))

    return ()


def normalize_bundle_result(bundle_result):
    if isinstance(bundle_result, tuple) and len(bundle_result) == 2:
        data, metadata = bundle_result
    else:
        data, metadata = bundle_result, {}

    if not isinstance(data, dict):
        data = {}

    if not isinstance(metadata, dict):
        metadata = {}

    return data, metadata


def encode_binary(value):
    if value is None:
        return None

    if isinstance(value, str):
        return value

    if isinstance(value, memoryview):
        value = value.tobytes()

    if isinstance(value, bytes):
        return base64.b64encode(value).decode("ascii")

    return None


def buffer_to_png_bundle(figure):
    png_buffer = io.BytesIO()
    figure.savefig(png_buffer, format="png", bbox_inches="tight")
    return {
        "image/png": base64.b64encode(png_buffer.getvalue()).decode("ascii"),
        "text/plain": safe_repr(figure),
    }


def build_plotly_bundle(value):
    try:
        html = value.to_html(full_html=False, include_plotlyjs=True)
    except Exception:
        return None, None

    return {
        "text/html": html,
        "text/plain": safe_repr(value),
    }, {}


def add_bundle_value(bundle, mime_type, value):
    if value in (None, ""):
        return

    if mime_type.startswith("image/"):
        encoded = encode_binary(value)

        if encoded:
            bundle[mime_type] = encoded

        return

    if isinstance(value, (dict, list, bool, int, float)):
        bundle[mime_type] = value
        return

    if isinstance(value, bytes):
        bundle[mime_type] = value.decode("utf-8", errors="replace")
        return

    bundle[mime_type] = str(value)


def call_mimebundle_method(method):
    try:
        return method(include=None, exclude=None)
    except TypeError:
        return method()


def build_mime_bundle(value):
    if value is None:
        return None, None

    if isinstance(value, (str, int, float, bool)):
        return {"text/plain": safe_repr(value)}, {}

    bundle = {}
    metadata = {}

    if hasattr(value, "_repr_mimebundle_"):
        try:
            raw_bundle, raw_metadata = normalize_bundle_result(call_mimebundle_method(value._repr_mimebundle_))

            for mime_type, mime_value in raw_bundle.items():
                add_bundle_value(bundle, mime_type, mime_value)

            metadata.update(raw_metadata)
        except Exception:
            pass

    for method_name, mime_type in (
        ("_repr_html_", "text/html"),
        ("_repr_markdown_", "text/markdown"),
        ("_repr_latex_", "text/latex"),
        ("_repr_svg_", "image/svg+xml"),
        ("_repr_png_", "image/png"),
        ("_repr_jpeg_", "image/jpeg"),
        ("_repr_json_", "application/json"),
    ):
        if mime_type in bundle or not hasattr(value, method_name):
            continue

        try:
            method_value = getattr(value, method_name)()
        except Exception:
            continue

        if isinstance(method_value, tuple) and len(method_value) == 2 and isinstance(method_value[1], dict):
            add_bundle_value(bundle, mime_type, method_value[0])
            metadata.update(method_value[1])
            continue

        add_bundle_value(bundle, mime_type, method_value)

    module_name = getattr(value.__class__, "__module__", "")

    if not bundle and module_name.startswith("plotly") and hasattr(value, "to_html"):
        return build_plotly_bundle(value)

    if not bundle and module_name.startswith("matplotlib") and hasattr(value, "savefig"):
        try:
            return buffer_to_png_bundle(value), {}
        except Exception:
            pass

    if not bundle and hasattr(value, "to_html"):
        try:
            add_bundle_value(bundle, "text/html", value.to_html())
        except Exception:
            pass

    if "text/plain" not in bundle:
        bundle["text/plain"] = safe_repr(value)

    return bundle, metadata


def emit_display_output(value, output_type="display_data"):
    context = DISPLAY_CONTEXT["current"]

    if context is None:
        return

    try:
        bundle, metadata = build_mime_bundle(value)
    except Exception:
        bundle, metadata = build_text_fallback_bundle(value)

    if not bundle:
        return

    object_id = id(value)
    context.displayed_object_ids.add(object_id)

    output = {
        "output_type": output_type,
        "data": bundle,
        "metadata": metadata,
    }

    if output_type == "execute_result":
        output["execution_count"] = context.execution_count

    context.emit_output(output)


def emit_error_output(error):
    context = DISPLAY_CONTEXT["current"]

    if context is None:
        return

    context.emit_output(
        {
            "output_type": "error",
            "ename": error.__class__.__name__,
            "evalue": str(error),
            "traceback": traceback.format_exception(type(error), error, error.__traceback__),
        }
    )


def patch_ipython_display():
    ipython_display = sys.modules.get("IPython.display")

    if ipython_display is None:
        return

    if getattr(ipython_display, "_crosspp_display_patched", False):
        return

    def _display(*objects, **_kwargs):
        for value in objects:
            emit_display_output(value, "display_data")

    ipython_display.display = _display
    ipython_display._crosspp_display_patched = True


def patch_plotly():
    plotly_base = sys.modules.get("plotly.basedatatypes")

    if plotly_base is None:
        return

    if getattr(plotly_base.BaseFigure, "_crosspp_show_patched", False):
        return

    def _show(self, *_args, **_kwargs):
        emit_display_output(self, "display_data")
        return None

    plotly_base.BaseFigure.show = _show
    plotly_base.BaseFigure._crosspp_show_patched = True


def patch_matplotlib():
    matplotlib = sys.modules.get("matplotlib")
    plt = sys.modules.get("matplotlib.pyplot")
    matplotlib_figure = sys.modules.get("matplotlib.figure")

    if matplotlib is None or plt is None or matplotlib_figure is None:
        return

    try:
        matplotlib.use("Agg", force=True)
    except Exception:
        pass

    Figure = getattr(matplotlib_figure, "Figure", None)

    if Figure is None:
        return

    if not getattr(plt, "_crosspp_show_patched", False):
        def _show(*_args, **_kwargs):
            context = DISPLAY_CONTEXT["current"]

            if context is not None:
                context.capture_all_figures = True

            return None

        plt.show = _show
        plt._crosspp_show_patched = True

    if not getattr(Figure, "_crosspp_show_patched", False):
        def _figure_show(self, *_args, **_kwargs):
            context = DISPLAY_CONTEXT["current"]

            if context is not None:
                context.capture_all_figures = True

            return None

        Figure.show = _figure_show
        Figure._crosspp_show_patched = True


def patched_import(name, globals=None, locals=None, fromlist=(), level=0):
    normalized_fromlist = normalize_fromlist(fromlist)
    module = ORIGINAL_IMPORT(name, globals, locals, normalized_fromlist, level)
    requested_names = [name, *normalized_fromlist]

    for requested_name in requested_names:
        if requested_name.startswith("IPython"):
            patch_ipython_display()
        elif requested_name.startswith("plotly"):
            patch_plotly()
        elif requested_name.startswith("matplotlib"):
            patch_matplotlib()

    return module


def install_runtime_helpers(namespace):
    def _display(*objects, **_kwargs):
        for value in objects:
            emit_display_output(value, "display_data")

    def _input(_prompt=""):
        raise RuntimeError("Interactive input is not supported in notebook cells.")

    namespace["display"] = _display
    builtins.display = _display
    builtins.input = _input


def maybe_capture_matplotlib_figures(before_figures):
    try:
        import matplotlib.pyplot as plt
    except Exception:
        return

    context = DISPLAY_CONTEXT["current"]

    if context is None:
        return

    current_figure_ids = list(plt.get_fignums())

    if context.capture_all_figures:
        figure_ids_to_render = current_figure_ids
    else:
        figure_ids_to_render = [figure_id for figure_id in current_figure_ids if figure_id not in before_figures]

    for figure_id in figure_ids_to_render:
        try:
            figure = plt.figure(figure_id)
        except Exception:
            continue

        if id(figure) in context.displayed_object_ids:
            continue

        bundle = buffer_to_png_bundle(figure)
        context.emit_output(
            {
                "output_type": "display_data",
                "data": bundle,
                "metadata": {},
            }
        )
        context.displayed_object_ids.add(id(figure))

    for figure_id in current_figure_ids:
        if figure_id not in before_figures:
            try:
                plt.close(figure_id)
            except Exception:
                pass


def current_matplotlib_figures():
    try:
        import matplotlib.pyplot as plt

        return set(plt.get_fignums())
    except Exception:
        return set()


def execute_source(source, namespace, cell_id):
    normalized_source = source.replace("\r\n", "\n")
    tree = ast.parse(normalized_source, filename=f"<cell {cell_id}>", mode="exec")
    should_capture_expression = (
        bool(tree.body)
        and isinstance(tree.body[-1], ast.Expr)
        and not normalized_source.rstrip().endswith(";")
    )

    statements = tree.body[:-1] if should_capture_expression else tree.body

    if statements:
        module = ast.Module(body=statements, type_ignores=[])
        ast.fix_missing_locations(module)
        exec(compile(module, filename=f"<cell {cell_id}>", mode="exec"), namespace)

    if should_capture_expression:
        expression = ast.Expression(tree.body[-1].value)
        ast.fix_missing_locations(expression)
        result = eval(compile(expression, filename=f"<cell {cell_id}>", mode="eval"), namespace)
        namespace["_"] = result

        if result is not None:
            emit_display_output(result, "execute_result")


def handle_execute(command, namespace, execution_count):
    command_id = command.get("id")
    cell_id = command.get("cell_id")
    source = command.get("source") or ""
    context = ExecutionContext(command_id, cell_id, execution_count)

    WRITER.emit(
        {
            "event": "execution_started",
            "id": command_id,
            "cell_id": cell_id,
            "execution_count": execution_count,
        }
    )

    DISPLAY_CONTEXT["current"] = context
    before_figures = current_matplotlib_figures()

    try:
        with contextlib.redirect_stdout(StreamCapture("stdout")), contextlib.redirect_stderr(
            StreamCapture("stderr")
        ):
            execute_source(source, namespace, cell_id)

        maybe_capture_matplotlib_figures(before_figures)

        WRITER.emit(
            {
                "event": "execution_finished",
                "id": command_id,
                "cell_id": cell_id,
                "execution_count": execution_count,
                "status": "ok",
            }
        )
    except KeyboardInterrupt as error:
        emit_error_output(error)
        WRITER.emit(
            {
                "event": "execution_finished",
                "id": command_id,
                "cell_id": cell_id,
                "execution_count": execution_count,
                "status": "interrupted",
            }
        )
    except BaseException as error:
        emit_error_output(error)
        WRITER.emit(
            {
                "event": "execution_finished",
                "id": command_id,
                "cell_id": cell_id,
                "execution_count": execution_count,
                "status": "error",
            }
        )
    finally:
        DISPLAY_CONTEXT["current"] = None


def main():
    builtins.__import__ = patched_import
    namespace = {
        "__name__": "__main__",
        "__file__": None,
    }
    install_runtime_helpers(namespace)

    execution_count = 0

    WRITER.emit(
        {
            "event": "ready",
            "python_path": sys.executable,
            "python_version": ".".join(map(str, sys.version_info[:3])),
            "cwd": os.getcwd(),
        }
    )
    for raw_line in sys.stdin:
        line = raw_line.strip()

        if not line:
            continue

        try:
            command = json.loads(line)
        except Exception as error:
            WRITER.emit(
                {
                    "event": "protocol_error",
                    "message": str(error),
                }
            )
            continue

        command_type = command.get("type")

        if command_type == "shutdown":
            WRITER.emit({"event": "shutdown"})
            break

        if command_type != "execute":
            WRITER.emit(
                {
                    "event": "protocol_error",
                    "message": f"Unsupported command: {command_type}",
                }
            )
            continue

        execution_count += 1
        handle_execute(command, namespace, execution_count)


if __name__ == "__main__":
    main()

