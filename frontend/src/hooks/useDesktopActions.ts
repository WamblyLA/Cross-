import { useCallback } from "react";
import {
  activateBottomPanelTab,
  hideBottomPanel,
  showBottomPanel,
} from "../features/panel/panelSlice";
import {
  terminalSessionActivated,
  terminalSessionReady,
  terminalSessionsLoaded,
} from "../features/terminal/terminalSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function useDesktopActions() {
  const dispatch = useAppDispatch();
  const activeTerminalId = useAppSelector((state) => state.terminal.activeTerminalId);
  const isTerminalTabVisible = useAppSelector(
    (state) => state.panel.isVisible && state.panel.activeTab === "terminal",
  );

  const syncTerminalList = useCallback(
    (payload: { terminals: TerminalMeta[]; activeTerminalId?: string | null }) => {
      dispatch(
        terminalSessionsLoaded({
          terminals: payload.terminals.filter((terminal) => terminal.kind === "shell"),
          activeTerminalId: payload.activeTerminalId ?? null,
        }),
      );
    },
    [dispatch],
  );

  const ensureTerminalSession = useCallback(
    async (terminalId?: string | null) => {
      const session = await window.electronAPI.ensureTerminalSession(
        terminalId ?? activeTerminalId ?? null,
      );

      dispatch(
        terminalSessionReady({
          terminal: session.terminal,
        }),
      );

      return session;
    },
    [activeTerminalId, dispatch],
  );

  const listTerminalSessions = useCallback(async () => {
    const result = await window.electronAPI.listTerminalSessions();
    syncTerminalList(result);
    return result;
  }, [syncTerminalList]);

  const createTerminal = useCallback(async () => {
    const result = await window.electronAPI.createTerminalSession();

    dispatch(
      terminalSessionReady({
        terminal: result.terminal,
      }),
    );
    dispatch(showBottomPanel("terminal"));

    return result;
  }, [dispatch]);

  const activateTerminal = useCallback(
    async (terminalId: string) => {
      const result = await window.electronAPI.activateTerminalSession(terminalId);
      syncTerminalList(result);
      dispatch(terminalSessionActivated({ terminalId: result.activeTerminalId }));
      dispatch(activateBottomPanelTab("terminal"));
      return result;
    },
    [dispatch, syncTerminalList],
  );

  const openTerminal = useCallback(async () => {
    const session = await ensureTerminalSession();
    dispatch(showBottomPanel("terminal"));
    return session;
  }, [dispatch, ensureTerminalSession]);

  const toggleTerminal = useCallback(async () => {
    if (isTerminalTabVisible) {
      dispatch(hideBottomPanel());
      return;
    }

    await openTerminal();
  }, [dispatch, isTerminalTabVisible, openTerminal]);

  const focusTerminal = useCallback(async () => {
    await ensureTerminalSession();
    dispatch(activateBottomPanelTab("terminal"));
  }, [dispatch, ensureTerminalSession]);

  const printTerminalMessage = useCallback(
    async (message: string) => {
      const session = await ensureTerminalSession();
      await window.electronAPI.printTerminalMessage(message, session.terminal.id);
    },
    [ensureTerminalSession],
  );

  const clearTerminal = useCallback(
    async (terminalId?: string | null) => {
      const session = await ensureTerminalSession(terminalId ?? activeTerminalId ?? null);
      await window.electronAPI.clearTerminal(session.terminal.id);
      return session;
    },
    [activeTerminalId, ensureTerminalSession],
  );

  const interruptTerminal = useCallback(
    async (terminalId?: string | null) => {
      const targetTerminalId = terminalId ?? activeTerminalId;

      if (!targetTerminalId) {
        return null;
      }

      const result = await window.electronAPI.interruptTerminal(targetTerminalId);
      dispatch(
        terminalSessionReady({
          terminal: result.terminal,
        }),
      );
      return result;
    },
    [activeTerminalId, dispatch],
  );

  return {
    ensureTerminalSession,
    listTerminalSessions,
    createTerminal,
    activateTerminal,
    openTerminal,
    toggleTerminal,
    focusTerminal,
    printTerminalMessage,
    clearTerminal,
    interruptTerminal,
  };
}
