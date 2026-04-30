const CLEAR_TERMINAL_SEQUENCE = "\u001b[2J\u001b[3J\u001b[H";
const DEFAULT_TERMINAL_COLS = 120;
const DEFAULT_TERMINAL_ROWS = 30;

function createTerminalId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildNodePtyUnavailableError(nodePtyLoadError) {
  const baseMessage =
    "node-pty не удалось загрузить для Electron. Выполните npm run rebuild:native -w ./frontend";
  const details = nodePtyLoadError instanceof Error ? nodePtyLoadError.message : null;

  return new Error(details ? `${baseMessage}. Подробности: ${details}` : baseMessage);
}

export function createTerminalSessionService({
  nodePty,
  nodePtyLoadError,
  profileService,
  getInitialTerminalCwd,
  sendToRenderer,
}) {
  let sessions = new Map();
  let sessionOrder = [];
  let activeTerminalId = null;
  let terminalSize = {
    cols: DEFAULT_TERMINAL_COLS,
    rows: DEFAULT_TERMINAL_ROWS,
  };

  function getSession(terminalId) {
    return terminalId ? sessions.get(terminalId) ?? null : null;
  }

  function buildTerminalMeta(session) {
    return {
      id: session.id,
      title: session.title,
      shellLabel: session.label,
      kind: "shell",
      profileId: session.profileId,
      shellType: session.shellType,
    };
  }

  function listSessions() {
    return sessionOrder
      .map((terminalId) => sessions.get(terminalId) ?? null)
      .filter(Boolean)
      .map((session) => buildTerminalMeta(session));
  }

  function buildSessionListPayload() {
    return {
      terminals: listSessions(),
      activeTerminalId,
    };
  }

  function emitTerminalData(terminalId, text) {
    if (!text) {
      return;
    }

    sendToRenderer("terminal:data", {
      terminalId,
      text,
    });
  }

  function emitTerminalStatus(payload) {
    sendToRenderer("terminal:status", payload);
  }

  function disposePty(session) {
    if (!session?.pty) {
      return;
    }

    try {
      session.pty.kill();
    } catch {
      // noop
    }

    session.pty = null;
  }

  function resolveNextActiveTerminalId(closedTerminalId) {
    const closedIndex = sessionOrder.indexOf(closedTerminalId);
    const remainingIds = sessionOrder.filter((terminalId) => terminalId !== closedTerminalId);

    if (remainingIds.length === 0) {
      return null;
    }

    const preferredIndex = closedIndex >= remainingIds.length ? remainingIds.length - 1 : closedIndex;
    return remainingIds[preferredIndex] ?? remainingIds[0] ?? null;
  }

  function removeSession(terminalId) {
    const nextActiveTerminalId =
      activeTerminalId === terminalId ? resolveNextActiveTerminalId(terminalId) : activeTerminalId;

    sessions.delete(terminalId);
    sessionOrder = sessionOrder.filter((entry) => entry !== terminalId);
    activeTerminalId = nextActiveTerminalId && sessions.has(nextActiveTerminalId)
      ? nextActiveTerminalId
      : sessionOrder[0] ?? null;
  }

  function disposeSession(terminalId, { notifyRenderer = true } = {}) {
    const session = getSession(terminalId);

    if (!session) {
      return buildSessionListPayload();
    }

    session.disposed = true;
    disposePty(session);
    removeSession(terminalId);

    if (notifyRenderer) {
      emitTerminalStatus({
        type: "closed",
        terminalId,
      });
    }

    return buildSessionListPayload();
  }

  function createSessionTitle(profile) {
    const sameProfileCount = sessionOrder
      .map((terminalId) => sessions.get(terminalId) ?? null)
      .filter((session) => session?.profileId === profile.id).length;
    const nextIndex = sameProfileCount + 1;

    return nextIndex === 1 ? profile.label : `${profile.label} ${nextIndex}`;
  }

  function handleTerminalExit(terminalId, spawnId) {
    const session = getSession(terminalId);

    if (!session || session.disposed || session.spawnId !== spawnId) {
      return;
    }

    session.pty = null;
    disposeSession(terminalId, { notifyRenderer: true });
  }

  function createPtySession(profile) {
    if (!nodePty) {
      throw buildNodePtyUnavailableError(nodePtyLoadError);
    }

    const terminalId = createTerminalId("terminal");
    const title = createSessionTitle(profile);
    const pty = nodePty.spawn(profile.command, profile.args, {
      cwd: getInitialTerminalCwd(),
      cols: terminalSize.cols,
      rows: terminalSize.rows,
      env: {
        ...process.env,
        TERM: process.platform === "win32" ? "xterm" : "xterm-256color",
      },
      name: process.platform === "win32" ? "xterm" : "xterm-256color",
      useConpty: process.platform === "win32",
    });
    const spawnId = createTerminalId("spawn");
    const session = {
      id: terminalId,
      title,
      label: profile.label,
      profileId: profile.id,
      shellType: profile.shellType,
      pty,
      spawnId,
      disposed: false,
    };

    pty.onData((chunk) => {
      const currentSession = getSession(terminalId);

      if (!currentSession || currentSession.spawnId !== spawnId) {
        return;
      }

      emitTerminalData(terminalId, chunk);
    });

    pty.onExit(() => {
      handleTerminalExit(terminalId, spawnId);
    });

    sessions.set(terminalId, session);
    sessionOrder.push(terminalId);
    activeTerminalId = terminalId;

    return session;
  }

  async function createTerminalSession(options = {}) {
    const launchCandidates = await profileService.resolveLaunchCandidates(options.profileId ?? null);
    let lastError = null;

    for (const profile of launchCandidates) {
      try {
        const session = createPtySession(profile);

        return {
          terminal: buildTerminalMeta(session),
          ...buildSessionListPayload(),
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Не удалось запустить ни один доступный терминал.");
  }

  async function ensureTerminalSession(terminalId = null) {
    if (terminalId) {
      const requestedSession = getSession(terminalId);

      if (requestedSession) {
        activeTerminalId = requestedSession.id;
        return {
          terminal: buildTerminalMeta(requestedSession),
        };
      }
    }

    const activeSession = getSession(activeTerminalId);

    if (activeSession) {
      return {
        terminal: buildTerminalMeta(activeSession),
      };
    }

    const createdSession = await createTerminalSession();

    return {
      terminal: createdSession.terminal,
    };
  }

  function activateTerminalSession(terminalId) {
    const session = getSession(terminalId);

    if (!session) {
      throw new Error("Терминал был закрыт. Откройте его заново.");
    }

    activeTerminalId = session.id;
    return buildSessionListPayload();
  }

  function writeToTerminal(terminalId, data) {
    const session = getSession(terminalId);

    if (!session) {
      throw new Error("Терминал недоступен.");
    }

    if (session.pty) {
      session.pty.write(data);
    }

    return {
      success: true,
      terminal: buildTerminalMeta(session),
    };
  }

  function resizeTerminal(terminalId, cols, rows) {
    const session = getSession(terminalId);

    if (!session) {
      throw new Error("Терминал недоступен.");
    }

    const nextCols = Number.isFinite(cols) && cols > 0 ? Math.floor(cols) : terminalSize.cols;
    const nextRows = Number.isFinite(rows) && rows > 0 ? Math.floor(rows) : terminalSize.rows;

    terminalSize = {
      cols: nextCols,
      rows: nextRows,
    };

    if (session.pty) {
      try {
        session.pty.resize(nextCols, nextRows);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : `${error ?? ""}`.toLowerCase();

        if (
          message.includes("already exited") ||
          message.includes("cannot resize") ||
          message.includes("closed")
        ) {
          session.pty = null;
          return { success: true };
        }

        throw error;
      }
    }

    return { success: true };
  }

  function interruptTerminal(terminalId) {
    const session = getSession(terminalId);

    if (!session) {
      throw new Error("Терминал недоступен.");
    }

    if (session.pty) {
      session.pty.write("\u0003");
    }

    return {
      success: true,
      terminal: buildTerminalMeta(session),
    };
  }

  function clearTerminal(terminalId) {
    const session = getSession(terminalId);

    if (!session) {
      throw new Error("Терминал недоступен.");
    }

    emitTerminalData(session.id, CLEAR_TERMINAL_SEQUENCE);

    return {
      success: true,
      terminal: buildTerminalMeta(session),
    };
  }

  function printTerminalMessage(text, terminalId) {
    const session = getSession(terminalId);

    if (!session) {
      throw new Error("Терминал недоступен.");
    }

    emitTerminalData(session.id, `${text.endsWith("\n") ? text : `${text}\r\n`}`);
    return { success: true };
  }

  function disposeAllSessions() {
    for (const terminalId of [...sessionOrder]) {
      disposeSession(terminalId, { notifyRenderer: false });
    }
  }

  return {
    createTerminalSession,
    ensureTerminalSession,
    listTerminalSessions: buildSessionListPayload,
    activateTerminalSession,
    closeTerminalSession: disposeSession,
    writeToTerminal,
    resizeTerminal,
    interruptTerminal,
    clearTerminal,
    printTerminalMessage,
    disposeAllSessions,
  };
}
