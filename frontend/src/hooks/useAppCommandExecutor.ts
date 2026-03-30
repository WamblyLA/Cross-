import { useCallback } from "react";
import { APP_COMMANDS, type AppCommandId } from "../features/commands/appCommands";
import { requestExplorerAction } from "../features/workspace/workspaceSlice";
import { useDesktopActions } from "./useDesktopActions";
import { useRunActions } from "./useRunActions";
import { useWorkspaceActions } from "./useWorkspaceActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function useAppCommandExecutor() {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const { createTerminal, toggleTerminal } = useDesktopActions();
  const { runSelectedConfiguration, stopRun } = useRunActions();
  const { openFolder, saveActiveFile } = useWorkspaceActions();

  return useCallback(
    async (commandId: AppCommandId | string) => {
      switch (commandId) {
        case APP_COMMANDS.WORKSPACE_OPEN_FOLDER:
          await openFolder();
          return;
        case APP_COMMANDS.WORKSPACE_SAVE_ACTIVE_FILE:
          await saveActiveFile();
          return;
        case APP_COMMANDS.WORKSPACE_CREATE_FILE:
          if (source === "local" && !rootPath) {
            return;
          }

          dispatch(requestExplorerAction("create-file"));
          return;
        case APP_COMMANDS.WORKSPACE_CREATE_FOLDER:
          if (source === "local" && !rootPath) {
            return;
          }

          dispatch(requestExplorerAction("create-folder"));
          return;
        case APP_COMMANDS.PANEL_TOGGLE_TERMINAL:
          await toggleTerminal();
          return;
        case APP_COMMANDS.TERMINAL_CREATE:
          await createTerminal();
          return;
        case APP_COMMANDS.RUN_START:
          await runSelectedConfiguration();
          return;
        case APP_COMMANDS.RUN_STOP:
          await stopRun();
          return;
        default:
      }
    },
    [
      createTerminal,
      dispatch,
      openFolder,
      rootPath,
      runSelectedConfiguration,
      saveActiveFile,
      source,
      stopRun,
      toggleTerminal,
    ],
  );
}
