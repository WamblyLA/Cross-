import { spawn } from "child_process";
import path from "path";
import {
  basenameWithoutExtension,
  buildWindowsCommandLine,
  createRunId,
  ensureDirectory,
  parseArgumentsText,
  parseEnvironmentText,
  toErrorMessage,
} from "./utils.js";

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 30;
const STOP_GRACE_TIMEOUT_MS = 1200;
const STOP_FORCE_TIMEOUT_MS = 3000;

function isCppSourceExtension(extension) {
  return ["cpp", "cc", "cxx"].includes(`${extension ?? ""}`.trim().toLowerCase());
}

function isPythonExtension(extension) {
  return `${extension ?? ""}`.trim().toLowerCase() === "py";
}

function isPathInsideRoot(targetPath, rootPath) {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function getCompiledBinaryPath(buildDirectory, sourcePath) {
  const extension = process.platform === "win32" ? ".exe" : "";
  return path.join(buildDirectory, `${basenameWithoutExtension(sourcePath)}${extension}`);
}

function isBusyStatus(status) {
  return ["preparing", "materializing", "building", "running"].includes(status);
}

function createSerializableSession(session) {
  return {
    id: session.id,
    configurationId: session.configurationId,
    configurationName: session.configurationName,
    configurationKind: session.configurationKind,
    workspaceKey: session.workspaceKey,
    workspaceLabel: session.workspaceLabel,
    status: session.status,
    stage: session.stage,
    statusText: session.statusText,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    exitCode: session.exitCode,
    errorMessage: session.errorMessage,
    targetPath: session.targetPath,
    workingDirectory: session.workingDirectory,
    runtimeLabel: session.runtimeLabel,
    supportsInput: session.supportsInput,
    isBusy: isBusyStatus(session.status),
    canRerun: Boolean(session.launchRequest),
  };
}

async function terminateProcessTree(pid, { force }) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/PID", `${pid}`, "/T", ...(force ? ["/F"] : [])],
        {
          windowsHide: true,
          stdio: "ignore",
        },
      );

      killer.once("error", () => resolve());
      killer.once("close", () => resolve());
    });
    return;
  }

  try {
    process.kill(-pid, force ? "SIGKILL" : "SIGTERM");
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : null;

    if (code !== "ESRCH") {
      throw error;
    }
  }
}

export function createExecutionManager({
  sendToRenderer,
  getConfiguration,
  resolvePythonInterpreter,
  resolveCppToolchain,
  materializeSnapshot,
  prepareSessionDirectory,
}) {
  let activeSession = null;
  let lastSession = null;
  let lastLaunchRequest = null;

  function emitSession(session) {
    const snapshot = createSerializableSession(session);
    sendToRenderer("run:session", snapshot);
    return snapshot;
  }

  function emitRunData(session, text, stream = "stdout") {
    if (!text || session.finalized) {
      return;
    }

    sendToRenderer("run:data", {
      sessionId: session.id,
      text,
      stream,
      stage: session.stage,
    });
  }

  function emitSystemLine(session, text) {
    emitRunData(session, `${text}\r\n`, "system");
  }

  function updateSession(session, patch) {
    if (session.finalized) {
      return createSerializableSession(session);
    }

    Object.assign(session, patch);
    return emitSession(session);
  }

  function clearStopLifecycle(session) {
    if (session.forceKillTimer) {
      clearTimeout(session.forceKillTimer);
      session.forceKillTimer = null;
    }

    if (session.finalizeStopTimer) {
      clearTimeout(session.finalizeStopTimer);
      session.finalizeStopTimer = null;
    }
  }

  function finishSession(session, patch) {
    if (session.finalized) {
      return createSerializableSession(session);
    }

    session.finalized = true;
    clearStopLifecycle(session);
    session.activeProcess = null;
    session.childPid = null;
    session.stopSequencePromise = null;

    Object.assign(session, {
      ...patch,
      finishedAt: patch.finishedAt ?? new Date().toISOString(),
      supportsInput: false,
    });

    if (activeSession?.id === session.id) {
      activeSession = null;
    }

    lastSession = session;
    return emitSession(session);
  }

  function createBaseSession(configuration, launchRequest) {
    return {
      id: createRunId("run"),
      configurationId: configuration.id,
      configurationName: configuration.name,
      configurationKind: configuration.kind,
      workspaceKey:
        launchRequest.workspace.scope === "local"
          ? `local:${launchRequest.workspace.rootPath}`
          : `cloud:${launchRequest.workspace.projectId}`,
      workspaceLabel:
        launchRequest.workspace.scope === "local"
          ? path.basename(launchRequest.workspace.rootPath)
          : launchRequest.workspace.projectName ?? "Облачный проект",
      status: "preparing",
      stage: "prepare",
      statusText: "Подготовка",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      exitCode: null,
      errorMessage: null,
      targetPath: null,
      workingDirectory: null,
      runtimeLabel: null,
      supportsInput: false,
      launchRequest,
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      activeProcess: null,
      childPid: null,
      stopRequested: false,
      requestedFinalStatus: null,
      stopRequestedAt: null,
      gracefulStopSent: false,
      forceKillTimer: null,
      finalizeStopTimer: null,
      stopSequencePromise: null,
      finalized: false,
    };
  }

  function finalizeStoppedSession(session, exitCode = null) {
    return finishSession(session, {
      status: session.requestedFinalStatus ?? "cancelled",
      stage: "finish",
      statusText:
        session.requestedFinalStatus === "interrupted" ? "Остановлено" : "Отменено",
      exitCode,
    });
  }

  function failSession(session, error, fallbackMessage, patch = {}) {
    const errorMessage = toErrorMessage(error, fallbackMessage);
    emitSystemLine(session, errorMessage);
    return finishSession(session, {
      status: "failed",
      stage: "finish",
      statusText: "Ошибка",
      exitCode: null,
      errorMessage,
      ...patch,
    });
  }

  async function ensureStopSequence(session) {
    if (!session.activeProcess || !session.childPid) {
      finalizeStoppedSession(session);
      return;
    }

    if (session.stopSequencePromise) {
      return;
    }

    session.stopSequencePromise = (async () => {
      const pid = session.childPid;
      session.gracefulStopSent = true;

      try {
        await terminateProcessTree(pid, { force: false });
      } catch {
        // DONE
      }

      session.forceKillTimer = setTimeout(() => {
        if (session.finalized || !session.childPid) {
          return;
        }

        emitSystemLine(session, "Принудительное завершение процесса...");
        void terminateProcessTree(session.childPid, { force: true }).catch(() => undefined);
      }, STOP_GRACE_TIMEOUT_MS);

      session.finalizeStopTimer = setTimeout(() => {
        if (session.finalized) {
          return;
        }

        emitSystemLine(
          session,
          "Процесс не подтвердил завершение, сессия закрыта принудительно.",
        );
        finalizeStoppedSession(session);
      }, STOP_FORCE_TIMEOUT_MS);
    })();
  }

  async function resolvePreparedTarget(session, configuration, launchRequest) {
    const workspace = launchRequest.workspace;
    const activeFile = launchRequest.activeFile ?? null;

    if (configuration.kind === "python-file" || configuration.kind === "cpp-file") {
      if (!activeFile) {
        throw new Error("Нет активного файла для запуска.");
      }

      if (configuration.kind === "python-file" && !isPythonExtension(activeFile.extension)) {
        throw new Error(
          "Для этой конфигурации нужен активный Python-файл с расширением .py.",
        );
      }

      if (configuration.kind === "cpp-file" && !isCppSourceExtension(activeFile.extension)) {
        throw new Error(
          "Для этой конфигурации нужен активный C++-файл с расширением .cpp, .cc или .cxx.",
        );
      }

      if (activeFile.kind === "local") {
        const resolvedPath = path.resolve(activeFile.path);

        return {
          workspaceRootPath: workspace.rootPath ?? path.dirname(resolvedPath),
          targetPath: resolvedPath,
          workingDirectory: path.dirname(resolvedPath),
        };
      }

      if (!launchRequest.cloudSnapshot) {
        throw new Error(
          "Не удалось подготовить локальную копию облачного файла для запуска.",
        );
      }

      updateSession(session, {
        status: "materializing",
        stage: "materialize",
        statusText: "Подготовка локальной копии",
      });

      const materializedWorkspace = await materializeSnapshot(launchRequest.cloudSnapshot);
      const materializedTargetPath = materializedWorkspace.filePathById[activeFile.fileId];

      if (!materializedTargetPath) {
        throw new Error("Активный облачный файл не найден в локальной копии проекта.");
      }

      return {
        workspaceRootPath: materializedWorkspace.projectRootPath,
        targetPath: materializedTargetPath,
        workingDirectory: path.dirname(materializedTargetPath),
      };
    }

    if (configuration.kind === "python-project") {
      const entrypoint = `${configuration.entrypoint ?? ""}`.trim();

      if (!entrypoint) {
        throw new Error("Укажите entrypoint для конфигурации запуска проекта.");
      }

      let workspaceRootPath = null;

      if (workspace.scope === "local") {
        workspaceRootPath = workspace.rootPath ? path.resolve(workspace.rootPath) : null;
      } else {
        if (!launchRequest.cloudSnapshot) {
          throw new Error(
            "Не удалось подготовить локальную копию облачного проекта для запуска.",
          );
        }

        updateSession(session, {
          status: "materializing",
          stage: "materialize",
          statusText: "Подготовка локальной копии",
        });

        const materializedWorkspace = await materializeSnapshot(launchRequest.cloudSnapshot);
        workspaceRootPath = materializedWorkspace.projectRootPath;
      }

      if (!workspaceRootPath) {
        throw new Error("Не удалось определить корень проекта для запуска.");
      }

      const targetPath = path.resolve(workspaceRootPath, entrypoint);

      if (!isPathInsideRoot(targetPath, workspaceRootPath) && targetPath !== workspaceRootPath) {
        throw new Error("Entrypoint должен находиться внутри корня проекта.");
      }

      return {
        workspaceRootPath,
        targetPath,
        workingDirectory: workspaceRootPath,
      };
    }

    throw new Error("Неизвестный тип конфигурации запуска.");
  }

  function spawnStage(session, options) {
    if (session.stopRequested) {
      finalizeStoppedSession(session);
      return null;
    }

    const child = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...(options.env ?? {}),
      },
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });

    session.activeProcess = child;
    session.childPid = child.pid ?? null;
    session.runtimeLabel = options.runtimeLabel ?? null;
    session.supportsInput = Boolean(options.supportsInput);

    updateSession(session, {
      status: options.status,
      stage: options.stage,
      statusText: options.statusText,
      runtimeLabel: session.runtimeLabel,
      supportsInput: session.supportsInput,
    });

    child.stdout?.setEncoding("utf-8");
    child.stderr?.setEncoding("utf-8");

    child.stdout?.on("data", (chunk) => {
      if (session.finalized || session.activeProcess !== child) {
        return;
      }

      emitRunData(session, chunk, "stdout");
    });

    child.stderr?.on("data", (chunk) => {
      if (session.finalized || session.activeProcess !== child) {
        return;
      }

      emitRunData(session, chunk, "stderr");
    });

    child.stdin?.on("error", () => {
      // EXPECTED
    });

    const completionPromise = new Promise((resolve, reject) => {
      let settled = false;

      const finalize = (payload, handler) => {
        if (settled) {
          return;
        }

        settled = true;
        handler(payload);
      };

      child.once("error", (error) => {
        finalize(error, reject);
      });

      child.once("close", (exitCode) => {
        finalize(
          {
            exitCode: Number.isInteger(exitCode) ? exitCode : null,
          },
          resolve,
        );
      });
    });

    return {
      completionPromise: completionPromise.finally(() => {
        if (session.activeProcess === child) {
          session.activeProcess = null;
          session.childPid = null;
          session.supportsInput = false;
        }
      }),
    };
  }

  function launchPythonSession(session, configuration, preparedTarget) {
    try {
      const interpreter = resolvePythonInterpreter({
        interpreterPath: configuration.interpreterPath,
        workspaceRootPath: preparedTarget.workspaceRootPath,
      });
      const programArguments = parseArgumentsText(configuration.argumentsText);
      const environment = parseEnvironmentText(configuration.environmentText);

      emitSystemLine(session, `Запуск Python: ${path.basename(interpreter.path)}`);

      const stage = spawnStage(session, {
        command: interpreter.path,
        args: ["-u", preparedTarget.targetPath, ...programArguments],
        cwd: preparedTarget.workingDirectory,
        env: {
          ...environment,
          PYTHONUNBUFFERED: "1",
          PYTHONIOENCODING: "utf-8",
        },
        status: "running",
        stage: "run",
        statusText: "Выполнение",
        runtimeLabel: path.basename(interpreter.path),
        supportsInput: true,
      });

      if (!stage) {
        return;
      }

      void stage.completionPromise
        .then((exitInfo) => {
          if (session.finalized) {
            return;
          }

          if (session.stopRequested) {
            finalizeStoppedSession(session, exitInfo.exitCode);
            return;
          }

          finishSession(session, {
            status: "finished",
            stage: "finish",
            statusText: "Завершено",
            exitCode: exitInfo.exitCode,
          });
        })
        .catch((error) => {
          if (session.finalized) {
            return;
          }

          failSession(session, error, "Не удалось запустить Python.");
        });
    } catch (error) {
      failSession(session, error, "Не удалось подготовить запуск Python.");
    }
  }

  async function launchCppSession(session, configuration, preparedTarget) {
    const toolchain = resolveCppToolchain({
      compilerPath: configuration.compilerPath,
    });
    const buildDirectory = await prepareSessionDirectory(session.id);
    const binaryPath = getCompiledBinaryPath(buildDirectory, preparedTarget.targetPath);
    const compileArguments = parseArgumentsText(configuration.compilerArgumentsText);
    const runtimeArguments = parseArgumentsText(configuration.argumentsText);
    const runtimeEnvironment = parseEnvironmentText(configuration.environmentText);

    await ensureDirectory(buildDirectory);
    emitSystemLine(session, `Сборка C++: ${toolchain.label}`);

    const compileStage =
      toolchain.kind === "msvc" && toolchain.setupScriptPath
        ? {
            command: process.env.comspec || "cmd.exe",
            args: [
              "/d",
              "/s",
              "/c",
              `"${toolchain.setupScriptPath}" && ${buildWindowsCommandLine(
                toolchain.path ?? "cl.exe",
                [
                  "/nologo",
                  "/std:c++17",
                  "/EHsc",
                  "/Zi",
                  `/Fe:${binaryPath}`,
                  `/Fo:${path.join(buildDirectory, "")}`,
                  preparedTarget.targetPath,
                  ...compileArguments,
                ],
              )}`,
            ],
          }
        : {
            command: toolchain.path ?? "g++",
            args: [
              preparedTarget.targetPath,
              "-std=c++17",
              "-g",
              "-o",
              binaryPath,
              ...compileArguments,
            ],
          };

    const buildStage = spawnStage(session, {
      command: compileStage.command,
      args: compileStage.args,
      cwd: preparedTarget.workingDirectory,
      status: "building",
      stage: "build",
      statusText: "Сборка",
      runtimeLabel: toolchain.label,
      supportsInput: false,
    });

    if (!buildStage) {
      return;
    }

    void buildStage.completionPromise
      .then((buildExitInfo) => {
        if (session.finalized) {
          return;
        }

        if (session.stopRequested) {
          finalizeStoppedSession(session, buildExitInfo.exitCode);
          return;
        }

        if (buildExitInfo.exitCode !== 0) {
          finishSession(session, {
            status: "failed",
            stage: "finish",
            statusText: "Ошибка сборки",
            exitCode: buildExitInfo.exitCode,
            errorMessage: "Компиляция C++ завершилась с ошибкой.",
          });
          return;
        }

        emitSystemLine(session, "Сборка завершена успешно. Запуск программы...");

        const runtimeStage = spawnStage(session, {
          command: binaryPath,
          args: runtimeArguments,
          cwd: preparedTarget.workingDirectory,
          env: runtimeEnvironment,
          status: "running",
          stage: "run",
          statusText: "Выполнение",
          runtimeLabel: path.basename(binaryPath),
          supportsInput: true,
        });

        if (!runtimeStage) {
          return;
        }

        void runtimeStage.completionPromise
          .then((runtimeExitInfo) => {
            if (session.finalized) {
              return;
            }

            if (session.stopRequested) {
              finalizeStoppedSession(session, runtimeExitInfo.exitCode);
              return;
            }

            finishSession(session, {
              status: "finished",
              stage: "finish",
              statusText: "Завершено",
              exitCode: runtimeExitInfo.exitCode,
            });
          })
          .catch((error) => {
            if (session.finalized) {
              return;
            }

            failSession(session, error, "Не удалось запустить собранную C++ программу.");
          });
      })
      .catch((error) => {
        if (session.finalized) {
          return;
        }

        failSession(session, error, "Не удалось выполнить сборку C++.");
      });
  }

  async function startRun(launchRequest) {
    if (activeSession && isBusyStatus(activeSession.status)) {
      throw new Error("Предыдущий запуск ещё выполняется. Сначала остановите его.");
    }

    const configuration = await getConfiguration(
      launchRequest.workspace,
      launchRequest.configurationId,
    );

    if (!configuration) {
      throw new Error("Активная конфигурация запуска не найдена.");
    }

    const session = createBaseSession(configuration, launchRequest);
    activeSession = session;
    lastLaunchRequest = launchRequest;
    emitSession(session);

    try {
      const preparedTarget = await resolvePreparedTarget(session, configuration, launchRequest);

      if (session.stopRequested) {
        finalizeStoppedSession(session);
        return createSerializableSession(session);
      }

      updateSession(session, {
        targetPath: preparedTarget.targetPath,
        workingDirectory: preparedTarget.workingDirectory,
        status: "preparing",
        stage: "prepare",
        statusText: "Подготовка",
      });

      if (configuration.kind === "python-file" || configuration.kind === "python-project") {
        launchPythonSession(session, configuration, preparedTarget);
      } else if (configuration.kind === "cpp-file") {
        await launchCppSession(session, configuration, preparedTarget);
      } else {
        throw new Error("Выбранная конфигурация запуска не поддерживается.");
      }

      return createSerializableSession(session);
    } catch (error) {
      if (!session.finalized) {
        const errorMessage = toErrorMessage(error, "Не удалось запустить программу.");
        failSession(session, errorMessage, "Не удалось запустить программу.");
        throw new Error(errorMessage);
      }

      throw error;
    }
  }

  async function stopRun() {
    if (!activeSession) {
      return lastSession ? createSerializableSession(lastSession) : null;
    }

    if (!isBusyStatus(activeSession.status)) {
      return createSerializableSession(activeSession);
    }

    if (activeSession.stopRequested) {
      return createSerializableSession(activeSession);
    }

    activeSession.stopRequested = true;
    activeSession.stopRequestedAt = Date.now();
    activeSession.requestedFinalStatus =
      activeSession.status === "running" ? "interrupted" : "cancelled";

    updateSession(activeSession, {
      statusText: "Остановка...",
      supportsInput: false,
    });

    emitSystemLine(
      activeSession,
      activeSession.requestedFinalStatus === "interrupted"
        ? "Остановка процесса..."
        : "Отмена запуска...",
    );

    if (!activeSession.activeProcess) {
      finalizeStoppedSession(activeSession);
      return lastSession ? createSerializableSession(lastSession) : null;
    }

    void ensureStopSequence(activeSession);
    return createSerializableSession(activeSession);
  }

  async function rerun() {
    if (!lastLaunchRequest) {
      throw new Error("Пока нет предыдущего запуска для повторного старта.");
    }

    return startRun(lastLaunchRequest);
  }

  function writeToRun(sessionId, data) {
    if (
      !activeSession ||
      activeSession.id !== sessionId ||
      !activeSession.activeProcess ||
      !activeSession.supportsInput ||
      activeSession.status !== "running"
    ) {
      return {
        success: false,
      };
    }

    try {
      activeSession.activeProcess.stdin?.write(data);
      return {
        success: true,
      };
    } catch {
      return {
        success: false,
      };
    }
  }

  function resizeRun(sessionId, cols, rows) {
    if (!activeSession || activeSession.id !== sessionId) {
      return {
        success: false,
      };
    }

    activeSession.cols = Number.isFinite(cols) && cols > 0 ? Math.floor(cols) : DEFAULT_COLS;
    activeSession.rows = Number.isFinite(rows) && rows > 0 ? Math.floor(rows) : DEFAULT_ROWS;

    return {
      success: true,
    };
  }

  function getCurrentSession() {
    if (activeSession) {
      return createSerializableSession(activeSession);
    }

    return lastSession ? createSerializableSession(lastSession) : null;
  }

  function dispose() {
    if (activeSession?.childPid) {
      void terminateProcessTree(activeSession.childPid, { force: true }).catch(() => undefined);
    }

    activeSession = null;
  }

  return {
    startRun,
    stopRun,
    rerun,
    writeToRun,
    resizeRun,
    getCurrentSession,
    dispose,
  };
}