import { spawn } from "child_process";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { listPythonInterpreters } from "../../run/pythonRuntimeLocator.js";
import { existsFile, normalizePathCase, toErrorMessage } from "../../run/utils.js";
import {
  buildInterpreterKernelId,
  mergeNotebookKernelDescriptors,
  normalizeKernelExecutablePath,
} from "./notebookKernelDescriptors.js";

const BRIDGE_READY_TIMEOUT_MS = 15000;
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const SESSION_REQUEST_TIMEOUT_MS = 30000;
const BRIDGE_SCRIPT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "python",
  "jupyter_bridge.py",
);

function buildProbeScript() {
  return [
    "import importlib.util, json, sys",
    "print(json.dumps({",
    "  'has_jupyter_client': importlib.util.find_spec('jupyter_client') is not None,",
    "  'has_jupyter_core': importlib.util.find_spec('jupyter_core') is not None,",
    "  'has_ipykernel': importlib.util.find_spec('ipykernel') is not None,",
    "  'version': '.'.join(map(str, sys.version_info[:3])),",
    "  'executable': sys.executable,",
    "}, ensure_ascii=False))",
  ].join("\n");
}

function createDiagnostic(message, details = null, interpreterPath = null) {
  return {
    source: "python-bridge",
    severity: "error",
    message,
    ...(details ? { details } : {}),
    ...(interpreterPath ? { interpreterPath } : {}),
  };
}

function isPythonKernel(kernel) {
  const language = `${kernel.language ?? ""}`.trim().toLowerCase();
  const displayName = `${kernel.displayName ?? ""}`.trim().toLowerCase();
  const name = `${kernel.name ?? ""}`.trim().toLowerCase();

  return (
    language === "python" ||
    language === "ipython" ||
    displayName.includes("python") ||
    name.includes("python")
  );
}

function compactPathForDisplay(filePath) {
  if (!filePath) {
    return null;
  }

  const homeDirectory = os.homedir();
  const resolvedPath = path.resolve(filePath);
  const normalizedResolved = normalizePathCase(resolvedPath);
  const normalizedHome = normalizePathCase(homeDirectory);

  if (normalizedResolved.startsWith(normalizedHome)) {
    return `~${resolvedPath.slice(homeDirectory.length)}`;
  }

  return resolvedPath;
}

function deriveEnvironmentLabel(interpreterPath) {
  if (!interpreterPath) {
    return null;
  }

  const normalizedPath = normalizePathCase(interpreterPath);
  const segments = normalizedPath.split(path.sep).filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const lastSegment = segments.at(-1);
  if (lastSegment !== "python.exe" && lastSegment !== "python") {
    return null;
  }

  const scriptsIndex = segments.lastIndexOf("scripts");
  if (scriptsIndex > 0) {
    const environmentName = segments[scriptsIndex - 1];

    if (environmentName === ".venv" || environmentName === "venv" || environmentName === "env") {
      return "Python";
    }

    return environmentName;
  }

  const envsIndex = segments.lastIndexOf("envs");
  if (envsIndex >= 0 && envsIndex + 1 < segments.length) {
    return segments[envsIndex + 1];
  }

  const parentDirectory = segments.at(-2);
  if (parentDirectory === "anaconda3" || parentDirectory === "miniconda3") {
    return "base";
  }

  return null;
}

function buildKernelPrimaryLabel(kernel, interpreterVersion, environmentLabel) {
  if (!isPythonKernel(kernel)) {
    return kernel.displayName;
  }

  if (environmentLabel && environmentLabel.toLowerCase() !== "python") {
    return interpreterVersion
      ? `${environmentLabel} (Python ${interpreterVersion})`
      : environmentLabel;
  }

  return interpreterVersion ? `Python ${interpreterVersion}` : kernel.displayName;
}

function buildKernelSecondaryLabel({
  executablePath,
  rawExecutableCommand,
  matchedInterpreter,
}) {
  return (
    compactPathForDisplay(executablePath) ??
    compactPathForDisplay(matchedInterpreter?.path ?? null) ??
    (rawExecutableCommand ? `Команда ядра: ${rawExecutableCommand}` : null)
  );
}

function buildInterpreterDisplayName(interpreterVersion, environmentLabel) {
  if (environmentLabel && environmentLabel.toLowerCase() !== "python") {
    return interpreterVersion
      ? `${environmentLabel} (Python ${interpreterVersion})`
      : environmentLabel;
  }

  return interpreterVersion ? `Python ${interpreterVersion}` : "Python";
}

function waitForChildProcess(childProcess) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    childProcess.stdout?.setEncoding("utf8");
    childProcess.stderr?.setEncoding("utf8");
    childProcess.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    childProcess.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    childProcess.once("close", (code) => {
      resolve({
        code,
        stdout,
        stderr,
      });
    });
  });
}

async function probeInterpreterSupport(interpreterPath) {
  const childProcess = spawn(interpreterPath, ["-c", buildProbeScript()], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    },
  });
  const result = await waitForChildProcess(childProcess);

  if (result.code !== 0) {
    return {
      ok: false,
      message: toErrorMessage(result.stderr, "Python probe failed."),
    };
  }

  try {
    const parsed = JSON.parse(
      result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .at(-1) ?? "{}",
    );

    const hasJupyterClient = Boolean(parsed.has_jupyter_client);
    const hasJupyterCore = Boolean(parsed.has_jupyter_core);
    const hasIpykernel = Boolean(parsed.has_ipykernel);

    return {
      ok: true,
      supportsBridge: hasJupyterClient && hasJupyterCore,
      supportsKernel: hasIpykernel,
      version: typeof parsed.version === "string" ? parsed.version : null,
      executable: typeof parsed.executable === "string" ? parsed.executable : interpreterPath,
      missingModules: [
        ...(!hasJupyterClient ? ["jupyter_client"] : []),
        ...(!hasJupyterCore ? ["jupyter_core"] : []),
        ...(!hasIpykernel ? ["ipykernel"] : []),
      ],
    };
  } catch (error) {
    return {
      ok: false,
      message: toErrorMessage(error, "Python probe returned invalid JSON."),
    };
  }
}

async function resolveBridgeInterpreter(workspaceRootPath) {
  const diagnostics = [];
  const interpreters = listPythonInterpreters({ workspaceRootPath });

  if (interpreters.length === 0) {
    const error = new Error("Не найден Python для Jupyter bridge.");
    error.diagnostics = [
      createDiagnostic(
        "Не найден Python-интерпретатор для запуска Jupyter bridge.",
      ),
    ];
    throw error;
  }

  for (const interpreter of interpreters) {
    const probe = await probeInterpreterSupport(interpreter.path);

    if (probe.supportsBridge) {
      return {
        interpreter: {
          ...interpreter,
          version: probe.version ?? null,
          executable: probe.executable ?? interpreter.path,
        },
        diagnostics,
      };
    }

    diagnostics.push(
      createDiagnostic(
        "Интерпретатор не подходит для notebook execution.",
        probe.message ??
          (probe.missingModules?.length
            ? `Отсутствуют модули: ${probe.missingModules.join(", ")}`
            : "Jupyter bridge probe failed."),
        interpreter.path,
      ),
    );
  }

  const error = new Error(
    "Не найден Python с установленными jupyter_client и jupyter_core.",
  );
  error.diagnostics = diagnostics;
  throw error;
}

async function enrichKernelDescriptors(kernels, workspaceRootPath) {
  const interpreters = listPythonInterpreters({ workspaceRootPath });
  const interpreterMap = new Map(
    interpreters.map((interpreter) => [normalizePathCase(interpreter.path), interpreter]),
  );
  const probeCache = new Map();

  const getProbe = async (interpreterPath) => {
    if (!interpreterPath || !existsFile(interpreterPath)) {
      return null;
    }

    const cacheKey = normalizePathCase(interpreterPath);

    if (probeCache.has(cacheKey)) {
      return probeCache.get(cacheKey);
    }

    const probe = await probeInterpreterSupport(interpreterPath);
    const resolvedProbe = probe.ok ? probe : null;
    probeCache.set(cacheKey, resolvedProbe);
    return resolvedProbe;
  };

  const kernelspecDescriptors = await Promise.all(
    kernels.map(async (kernel) => {
      const rawExecutableCommand =
        typeof kernel.executablePath === "string" && kernel.executablePath.trim()
          ? kernel.executablePath.trim()
          : null;
      const executablePath = rawExecutableCommand
        ? normalizeKernelExecutablePath(rawExecutableCommand)
        : null;
      const normalizedExecutablePath = executablePath ? normalizePathCase(executablePath) : null;
      const matchedInterpreter = normalizedExecutablePath
        ? interpreterMap.get(normalizedExecutablePath) ?? null
        : null;
      const probe = matchedInterpreter
        ? await getProbe(matchedInterpreter.path)
        : executablePath
          ? await getProbe(executablePath)
          : null;
      const interpreterPath = matchedInterpreter?.path ?? executablePath;
      const interpreterVersion = probe?.version ?? null;
      const environmentLabel = deriveEnvironmentLabel(interpreterPath);

      return {
        ...kernel,
        executablePath,
        interpreterPath,
        interpreterVersion,
        environmentLabel,
        primaryLabel: buildKernelPrimaryLabel(kernel, interpreterVersion, environmentLabel),
        secondaryLabel: buildKernelSecondaryLabel({
          executablePath,
          rawExecutableCommand,
          matchedInterpreter,
        }),
        kind: isPythonKernel(kernel) ? "python" : "kernel",
        launchKind: "kernelspec",
        kernelName: kernel.name,
      };
    }),
  );

  const interpreterDescriptors = (
    await Promise.all(
      interpreters.map(async (interpreter) => {
        const probe = await getProbe(interpreter.path);

        if (!probe?.supportsKernel) {
          return null;
        }

        const interpreterVersion = probe.version ?? null;
        const environmentLabel = deriveEnvironmentLabel(interpreter.path);
        const displayName = buildInterpreterDisplayName(interpreterVersion, environmentLabel);

        return {
          id: buildInterpreterKernelId(interpreter.path),
          name: displayName,
          displayName,
          primaryLabel: displayName,
          secondaryLabel: compactPathForDisplay(interpreter.path),
          language: "python",
          executablePath: interpreter.path,
          interpreterPath: interpreter.path,
          interpreterVersion,
          environmentLabel,
          resourceDir: null,
          interruptMode: null,
          kind: "python",
          isRecommended: Boolean(interpreter.isRecommended),
          launchKind: "interpreter",
          kernelName: null,
        };
      }),
    )
  ).filter(Boolean);

  return mergeNotebookKernelDescriptors(kernelspecDescriptors, interpreterDescriptors);
}

function parseJsonLines(buffer, chunk, onMessage) {
  const nextBuffer = `${buffer}${chunk}`;
  const lines = nextBuffer.split(/\r?\n/);
  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    const normalizedLine = line.trim();

    if (!normalizedLine) {
      continue;
    }

    try {
      onMessage(JSON.parse(normalizedLine));
    } catch {
      // DONE
    }
  }

  return remainder;
}

export function createPythonJupyterBridge() {
  let bridgeProcess = null;
  let bridgeInterpreter = null;
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let nextRequestId = 0;
  let startPromise = null;
  let readyResolver = null;
  let readyRejector = null;
  const pendingRequests = new Map();
  let eventHandler = () => {};

  function emitEvent(event) {
    eventHandler(event);
  }

  function rejectPendingRequests(message) {
    for (const { reject, timeoutId } of pendingRequests.values()) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      reject(new Error(message));
    }

    pendingRequests.clear();
  }

  function handleBridgeMessage(message) {
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "ready") {
      readyResolver?.();
      readyResolver = null;
      readyRejector = null;
      return;
    }

    if (message.type === "response" && typeof message.id === "string") {
      const request = pendingRequests.get(message.id);

      if (!request) {
        return;
      }

      pendingRequests.delete(message.id);

      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }

      if (message.ok) {
        request.resolve(message.result ?? null);
      } else {
        request.reject(new Error(message.error?.message ?? "Bridge request failed."));
      }

      return;
    }

    if (message.type === "event" && message.event) {
      emitEvent(message.event);
    }
  }

  function handleBridgeExit(code, signal) {
    const exitMessage = stderrBuffer
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1);

    bridgeProcess = null;
    startPromise = null;
    stdoutBuffer = "";
    rejectPendingRequests(
      exitMessage ??
        `Jupyter bridge завершился неожиданно (code=${code ?? "?"}, signal=${signal ?? "?"}).`,
    );
    readyRejector?.(
      new Error(
        exitMessage ??
          `Jupyter bridge завершился неожиданно (code=${code ?? "?"}, signal=${signal ?? "?"}).`,
      ),
    );
    readyResolver = null;
    readyRejector = null;

    emitEvent({
      type: "bridge-exited",
      reason: exitMessage ?? "bridge-exited",
    });
  }

  async function ensureBridge(options = {}) {
    if (bridgeProcess) {
      return bridgeProcess;
    }

    if (startPromise) {
      await startPromise;
      return bridgeProcess;
    }

    startPromise = (async () => {
      const resolved = await resolveBridgeInterpreter(options.workspaceRootPath ?? null);
      bridgeInterpreter = resolved.interpreter;
      const childProcess = spawn(bridgeInterpreter.path, [BRIDGE_SCRIPT_PATH], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1",
        },
      });

      bridgeProcess = childProcess;
      stdoutBuffer = "";
      stderrBuffer = "";
      childProcess.stdout?.setEncoding("utf8");
      childProcess.stderr?.setEncoding("utf8");

      childProcess.stdout?.on("data", (chunk) => {
        stdoutBuffer = parseJsonLines(stdoutBuffer, chunk, handleBridgeMessage);
      });
      childProcess.stderr?.on("data", (chunk) => {
        stderrBuffer = `${stderrBuffer}${chunk}`;
      });
      childProcess.once("exit", handleBridgeExit);

      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Jupyter bridge did not become ready in time."));
        }, BRIDGE_READY_TIMEOUT_MS);

        readyResolver = () => {
          clearTimeout(timeoutId);
          resolve();
        };
        readyRejector = (error) => {
          clearTimeout(timeoutId);
          reject(error);
        };
      });
    })();

    try {
      await startPromise;
    } finally {
      startPromise = null;
    }

    return bridgeProcess;
  }

  async function request(command, payload = {}, options = {}) {
    await ensureBridge(options);

    const requestId = `bridge-${++nextRequestId}`;
    const timeoutMs =
      options.timeoutMs === undefined ? DEFAULT_REQUEST_TIMEOUT_MS : options.timeoutMs;

    return new Promise((resolve, reject) => {
      const timeoutId =
        timeoutMs > 0
          ? setTimeout(() => {
              pendingRequests.delete(requestId);
              reject(new Error(`Bridge request timed out: ${command}`));
            }, timeoutMs)
          : null;

      pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
      });

      bridgeProcess.stdin.write(
        `${JSON.stringify({ id: requestId, command, payload })}\n`,
        "utf8",
        (error) => {
          if (!error) {
            return;
          }

          const pending = pendingRequests.get(requestId);

          if (!pending) {
            return;
          }

          pendingRequests.delete(requestId);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          reject(error);
        },
      );
    });
  }

  async function dispose() {
    if (!bridgeProcess) {
      return;
    }

    const activeProcess = bridgeProcess;
    bridgeProcess = null;
    rejectPendingRequests("Jupyter bridge was disposed.");
    activeProcess.kill();
  }

  return {
    setEventHandler(handler) {
      eventHandler = typeof handler === "function" ? handler : () => {};
    },
    async listKernels(options = {}) {
      const result = await request(
        "list_kernels",
        {},
        {
          workspaceRootPath: options.workspaceRootPath ?? null,
          timeoutMs: SESSION_REQUEST_TIMEOUT_MS,
        },
      );

      const kernels = await enrichKernelDescriptors(
        result.kernels ?? [],
        options.workspaceRootPath ?? null,
      );

      return {
        kernels,
        diagnostics: [
          ...(result.diagnostics ?? []),
          ...(bridgeInterpreter
            ? []
            : [
                createDiagnostic(
                  "Jupyter bridge не смог выбрать Python-интерпретатор.",
                ),
              ]),
        ],
      };
    },
    startSession(payload) {
      return request("start_session", payload, {
        workspaceRootPath: payload.preferredWorkspaceRootPath ?? null,
        timeoutMs: SESSION_REQUEST_TIMEOUT_MS,
      });
    },
    executeCell(payload) {
      return request("execute_cell", payload, {
        timeoutMs: 0,
      });
    },
    interruptSession(payload) {
      return request("interrupt_session", payload, {
        timeoutMs: SESSION_REQUEST_TIMEOUT_MS,
      });
    },
    restartSession(payload) {
      return request("restart_session", payload, {
        timeoutMs: SESSION_REQUEST_TIMEOUT_MS,
      });
    },
    shutdownSession(payload) {
      return request("shutdown_session", payload, {
        timeoutMs: SESSION_REQUEST_TIMEOUT_MS,
      });
    },
    dispose,
  };
}
