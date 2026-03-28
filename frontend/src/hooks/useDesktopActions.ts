import { useCallback } from "react";
import { setTerminalVisible, terminalReady } from "../features/runner/runnerSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function useDesktopActions() {
  const dispatch = useAppDispatch();
  const isTerminalVisible = useAppSelector((state) => state.runner.isVisible);

  const ensureTerminalSession = useCallback(async () => {
    const session = await window.electronAPI.ensureTerminalSession();

    dispatch(terminalReady({ shellLabel: session.terminal.shellLabel }));

    return session;
  }, [dispatch]);

  const openTerminal = useCallback(async () => {
    const session = await ensureTerminalSession();

    dispatch(setTerminalVisible(true));

    return session;
  }, [dispatch, ensureTerminalSession]);

  const toggleTerminal = useCallback(async () => {
    if (isTerminalVisible) {
      dispatch(setTerminalVisible(false));
      return null;
    }

    return openTerminal();
  }, [dispatch, isTerminalVisible, openTerminal]);

  const printTerminalMessage = useCallback(
    async (message: string) => {
      await ensureTerminalSession();
      await window.electronAPI.printTerminalMessage(message);
    },
    [ensureTerminalSession],
  );

  const clearTerminal = useCallback(async () => {
    await ensureTerminalSession();
    await window.electronAPI.clearTerminal();
  }, [ensureTerminalSession]);

  return {
    ensureTerminalSession,
    openTerminal,
    toggleTerminal,
    printTerminalMessage,
    clearTerminal,
  };
}
