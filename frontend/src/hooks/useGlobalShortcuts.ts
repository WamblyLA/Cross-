import { useEffect } from "react";
import { requestExplorerAction } from "../features/workspace/workspaceSlice";
import { useWorkspaceActions } from "./useWorkspaceActions";
import { useDesktopActions } from "./useDesktopActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";

function isIgnoredTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest(".monaco-editor") || target.closest(".xterm")) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function useGlobalShortcuts() {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const { toggleTerminal } = useDesktopActions();
  const { openFolder, saveActiveFile, runActivePythonFile } = useWorkspaceActions();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isIgnoredTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasPrimaryModifier = event.ctrlKey || event.metaKey;

      if (hasPrimaryModifier && !event.altKey && !event.shiftKey && key === "o") {
        event.preventDefault();
        void openFolder();
        return;
      }

      if (hasPrimaryModifier && !event.altKey && !event.shiftKey && key === "s") {
        event.preventDefault();
        void saveActiveFile();
        return;
      }

      if (hasPrimaryModifier && !event.altKey && !event.shiftKey && key === "n") {
        if (source === "local" && !rootPath) {
          return;
        }

        event.preventDefault();
        dispatch(requestExplorerAction("create-file"));
        return;
      }

      if (hasPrimaryModifier && !event.altKey && event.shiftKey && key === "n") {
        if (source === "local" && !rootPath) {
          return;
        }

        event.preventDefault();
        dispatch(requestExplorerAction("create-folder"));
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === "F5") {
        event.preventDefault();
        void runActivePythonFile();
        return;
      }

      if (hasPrimaryModifier && !event.altKey && !event.shiftKey && key === "j") {
        event.preventDefault();
        void toggleTerminal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dispatch, openFolder, rootPath, runActivePythonFile, saveActiveFile, source, toggleTerminal]);
}
