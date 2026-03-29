import { useCallback } from "react";
import {
  hideBottomPanel,
  showBottomPanel,
  toggleBottomPanelTab,
} from "../features/panel/panelSlice";
import { terminalSessionReady } from "../features/terminal/terminalSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function useDesktopActions() {
  const dispatch = useAppDispatch();
  const terminalId = useAppSelector((state) => state.terminal.terminalId);
  const isTerminalTabVisible = useAppSelector(
    (state) => state.panel.isVisible && state.panel.activeTab === "terminal",
  );

  const ensureTerminalSession = useCallback(async () => {
    const session = await window.electronAPI.ensureTerminalSession(terminalId);

    dispatch(
      terminalSessionReady({
        terminalId: session.terminal.id,
        title: session.terminal.title,
        shellLabel: session.terminal.shellLabel,
      }),
    );

    return session;
  }, [dispatch, terminalId]);

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

  const focusTerminalTab = useCallback(async () => {
    await ensureTerminalSession();
    dispatch(toggleBottomPanelTab("terminal"));
  }, [dispatch, ensureTerminalSession]);

  const printTerminalMessage = useCallback(
    async (message: string) => {
      const session = await ensureTerminalSession();
      await window.electronAPI.printTerminalMessage(message, session.terminal.id);
    },
    [ensureTerminalSession],
  );

  const clearTerminal = useCallback(async () => {
    const session = await ensureTerminalSession();
    await window.electronAPI.clearTerminal(session.terminal.id);
  }, [ensureTerminalSession]);

  return {
    ensureTerminalSession,
    openTerminal,
    toggleTerminal,
    focusTerminalTab,
    printTerminalMessage,
    clearTerminal,
  };
}
