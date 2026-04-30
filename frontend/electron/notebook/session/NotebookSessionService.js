import { toErrorMessage } from "../../run/utils.js";

function createSessionStatusEvent(runtimeId, status, detail = null, extra = {}) {
  return {
    type: "session-status",
    runtimeId,
    status,
    ...(detail ? { detail } : {}),
    ...extra,
  };
}

function createSessionErrorEvent(runtimeId, message) {
  return {
    type: "session-error",
    runtimeId,
    message,
  };
}

function buildSessionInfo(record) {
  return {
    runtimeId: record.runtimeId,
    kernelId: record.kernelId,
    kernelDisplayName: record.kernelDisplayName ?? null,
    status: record.status,
    detail: record.detail ?? null,
    languageInfoName: record.languageInfoName ?? null,
  };
}

export function createNotebookSessionService({
  bridge,
  materializer,
  sendToRenderer,
}) {
  const sessions = new Map();

  function emitEvent(event) {
    sendToRenderer("notebook:kernel-event", event);
  }

  function updateSession(runtimeId, patch) {
    const existing = sessions.get(runtimeId);

    if (!existing) {
      return null;
    }

    const nextRecord = {
      ...existing,
      ...patch,
    };

    sessions.set(runtimeId, nextRecord);
    return nextRecord;
  }

  async function cleanupRuntime(runtimeId) {
    await materializer.disposeRuntime(runtimeId);
    sessions.delete(runtimeId);
  }

  bridge.setEventHandler((event) => {
    if (!event || typeof event !== "object") {
      return;
    }

    if (event.type === "bridge-exited") {
      for (const record of sessions.values()) {
        record.status = "disconnected";
        record.detail = "Jupyter bridge завершился.";
        emitEvent(
          createSessionStatusEvent(record.runtimeId, "disconnected", "Jupyter bridge завершился."),
        );
      }

      return;
    }

    if (event.type === "session-status") {
      updateSession(event.runtimeId, {
        status: event.status,
        detail: event.detail ?? null,
      });
      emitEvent(event);
      return;
    }

    if (event.type === "session-error") {
      updateSession(event.runtimeId, {
        status: "failed",
        detail: event.message,
      });
      emitEvent(event);
      return;
    }

    emitEvent(event);
  });

  async function startSession({ runtimeContext, kernel }) {
    const runtimeId = runtimeContext.runtimeId;
    const kernelId = `${kernel?.id ?? ""}`.trim();
    const existing = sessions.get(runtimeId);

    if (!kernelId) {
      throw new Error("Не выбрано ядро ноутбука.");
    }

    if (
      existing &&
      existing.kernelId === kernelId &&
      !["dead", "failed", "disconnected"].includes(existing.status)
    ) {
      return {
        session: buildSessionInfo(existing),
      };
    }

    emitEvent(createSessionStatusEvent(runtimeId, "starting", "Запуск ядра..."));

    const materializedContext =
      existing?.materializedContext ??
      (await materializer.prepareExecutionContext(runtimeContext));

    try {
      const result = await bridge.startSession({
        runtimeId,
        kernelId,
        kernelLaunch: {
          launchKind: kernel.launchKind,
          kernelName: kernel.kernelName ?? null,
          displayName: kernel.displayName ?? kernelId,
          interpreterPath: kernel.interpreterPath ?? null,
        },
        notebookPath: materializedContext.notebookPath,
        workingDirectory: materializedContext.workingDirectory,
        preferredWorkspaceRootPath: materializedContext.workspaceRootPath ?? null,
      });

      const nextRecord = {
        runtimeId,
        runtimeContext,
        materializedContext,
        kernelId,
        kernelDisplayName: result.session?.kernelDisplayName ?? kernel.displayName ?? kernelId,
        languageInfoName: result.session?.languageInfoName ?? null,
        status: result.session?.status ?? "idle",
        detail: result.session?.detail ?? null,
      };

      sessions.set(runtimeId, nextRecord);
      emitEvent(
        createSessionStatusEvent(runtimeId, nextRecord.status, nextRecord.detail, {
          kernelId,
          kernelDisplayName: nextRecord.kernelDisplayName,
        }),
      );

      return {
        session: buildSessionInfo(nextRecord),
      };
    } catch (error) {
      const message = toErrorMessage(error, "Не удалось запустить ядро ноутбука.");
      updateSession(runtimeId, {
        status: "failed",
        detail: message,
      });
      emitEvent(createSessionErrorEvent(runtimeId, message));
      emitEvent(createSessionStatusEvent(runtimeId, "failed", message));
      throw error;
    }
  }

  async function executeCell(payload) {
    const session = sessions.get(payload.runtimeId);

    if (!session) {
      throw new Error("Сессия ноутбука не запущена.");
    }

    return bridge.executeCell(payload);
  }

  async function interruptSession(runtimeId) {
    const session = sessions.get(runtimeId);

    if (!session) {
      return { success: true };
    }

    emitEvent(createSessionStatusEvent(runtimeId, "interrupting", "Прерывание ядра..."));

    try {
      const result = await bridge.interruptSession({ runtimeId });
      return result ?? { success: true };
    } catch (error) {
      const message = toErrorMessage(error, "Не удалось прервать ядро.");
      emitEvent(createSessionErrorEvent(runtimeId, message));
      emitEvent(createSessionStatusEvent(runtimeId, "failed", message));
      throw error;
    }
  }

  async function restartSession(runtimeId) {
    const session = sessions.get(runtimeId);

    if (!session) {
      throw new Error("Сессия ноутбука не запущена.");
    }

    emitEvent(createSessionStatusEvent(runtimeId, "restarting", "Перезапуск ядра..."));

    try {
      const result = await bridge.restartSession({ runtimeId });
      const nextRecord = updateSession(runtimeId, {
        status: result.session?.status ?? "idle",
        detail: result.session?.detail ?? null,
        languageInfoName: result.session?.languageInfoName ?? session.languageInfoName ?? null,
      });

      emitEvent(
        createSessionStatusEvent(runtimeId, nextRecord?.status ?? "idle", nextRecord?.detail ?? null, {
          kernelId: session.kernelId,
          kernelDisplayName: session.kernelDisplayName,
        }),
      );

      return {
        session: nextRecord ? buildSessionInfo(nextRecord) : buildSessionInfo(session),
      };
    } catch (error) {
      const message = toErrorMessage(error, "Не удалось перезапустить ядро.");
      emitEvent(createSessionErrorEvent(runtimeId, message));
      emitEvent(createSessionStatusEvent(runtimeId, "failed", message));
      throw error;
    }
  }

  async function shutdownSession(runtimeId) {
    const session = sessions.get(runtimeId);

    if (!session) {
      return { success: true };
    }

    try {
      await bridge.shutdownSession({ runtimeId });
    } finally {
      await cleanupRuntime(runtimeId);
      emitEvent(createSessionStatusEvent(runtimeId, "dead", "Сессия ядра остановлена."));
    }

    return { success: true };
  }

  async function disposeAll() {
    for (const runtimeId of [...sessions.keys()]) {
      try {
        await bridge.shutdownSession({ runtimeId });
      } catch {
        // IGNORE
      }

      await cleanupRuntime(runtimeId);
    }

    await materializer.disposeAll();
    await bridge.dispose();
  }

  return {
    startSession,
    executeCell,
    interruptSession,
    restartSession,
    shutdownSession,
    disposeAll,
  };
}
