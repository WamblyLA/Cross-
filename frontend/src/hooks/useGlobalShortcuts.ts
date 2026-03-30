import { useEffect } from "react";
import { useAppCommandExecutor } from "./useAppCommandExecutor";

export function useGlobalShortcuts() {
  const executeCommand = useAppCommandExecutor();

  useEffect(() => {
    const unsubscribe = window.electronAPI.onAppCommand((payload) => {
      void executeCommand(payload.commandId);
    });

    return () => {
      unsubscribe();
    };
  }, [executeCommand]);
}
