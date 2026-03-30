import { useMemo } from "react";
import {
  APP_COMMANDS,
  APP_COMMAND_SHORTCUTS,
} from "../../features/commands/appCommands";
import type { WorkspaceSource } from "../../features/cloud/cloudTypes";
import type { TopBarMenuConfig } from "./topBarMenuTypes";
import { TOP_BAR_STRINGS } from "./topBarStrings";

type UseTopBarMenusParams = {
  source: WorkspaceSource;
  activeFile: { extension?: string | null } | null;
  activeSearchQuery: string;
  activeTerminalId: string | null;
  activeCloudProjectId: string | null;
  canCollapseExplorer: boolean;
  canCreateFile: boolean;
  canCreateFolder: boolean;
  canCreateProject: boolean;
  canDeleteSelectedNode: boolean;
  canRenameSelectedNode: boolean;
  canRefreshExplorer: boolean;
  canRunActiveTarget: boolean;
  currentRunSessionCanRerun: boolean;
  hasTerminalSession: boolean;
  isRunning: boolean;
  isTerminalReady: boolean;
  isTerminalVisible: boolean;
  terminalProfileDiscoveryStatus: "idle" | "loading" | "ready" | "error";
  terminalSessions: Array<{ id: string; title: string }>;
  terminalCreateProfileItems: TopBarMenuConfig["sections"][number]["items"];
  terminalDefaultProfileItems: TopBarMenuConfig["sections"][number]["items"];
  activateTerminal: (terminalId: string) => unknown | Promise<unknown>;
  clearTerminal: (terminalId?: string | null) => unknown | Promise<unknown>;
  closeTerminal: (terminalId: string) => unknown | Promise<unknown>;
  dispatchExplorerAction: (type: string) => void;
  executeCommand: (commandId: string) => unknown | Promise<unknown>;
  focusTerminal: () => unknown | Promise<unknown>;
  handleOpenCloudProjectDraft: () => void;
  interruptTerminal: (terminalId?: string | null) => unknown | Promise<unknown>;
  onOpenVisualSettings: () => void;
  openRunConfigurationDialog: () => void;
  openSearch: () => void;
  openTerminal: () => unknown | Promise<unknown>;
  rerun: () => unknown | Promise<unknown>;
};

export function useTopBarMenus({
  source,
  activeFile,
  activeSearchQuery,
  activeTerminalId,
  activeCloudProjectId,
  canCollapseExplorer,
  canCreateFile,
  canCreateFolder,
  canCreateProject,
  canDeleteSelectedNode,
  canRenameSelectedNode,
  canRefreshExplorer,
  canRunActiveTarget,
  currentRunSessionCanRerun,
  hasTerminalSession,
  isRunning,
  isTerminalReady,
  isTerminalVisible,
  terminalProfileDiscoveryStatus,
  terminalSessions,
  terminalCreateProfileItems,
  terminalDefaultProfileItems,
  activateTerminal,
  clearTerminal,
  closeTerminal,
  dispatchExplorerAction,
  executeCommand,
  focusTerminal,
  handleOpenCloudProjectDraft,
  interruptTerminal,
  onOpenVisualSettings,
  openRunConfigurationDialog,
  openSearch,
  openTerminal,
  rerun,
}: UseTopBarMenusParams) {
  return useMemo<TopBarMenuConfig[]>(
    () => [
      {
        id: "file",
        label: "Файл",
        sections: [
          {
            id: "file-main",
            items: [
              {
                id: "open-folder",
                label: "Открыть папку",
                shortcut:
                  APP_COMMAND_SHORTCUTS[APP_COMMANDS.WORKSPACE_OPEN_FOLDER],
                onSelect: () =>
                  executeCommand(APP_COMMANDS.WORKSPACE_OPEN_FOLDER),
              },
              {
                id: "new-project",
                label: "Новый проект в облаке",
                disabled: !canCreateProject,
                onSelect: handleOpenCloudProjectDraft,
              },
              {
                id: "new-file",
                label: source === "cloud" ? "Новый облачный файл" : "Новый файл",
                shortcut:
                  APP_COMMAND_SHORTCUTS[APP_COMMANDS.WORKSPACE_CREATE_FILE],
                disabled: !canCreateFile,
                onSelect: () =>
                  executeCommand(APP_COMMANDS.WORKSPACE_CREATE_FILE),
              },
              {
                id: "new-folder",
                label: "Новая папка",
                shortcut:
                  APP_COMMAND_SHORTCUTS[APP_COMMANDS.WORKSPACE_CREATE_FOLDER],
                disabled: !canCreateFolder,
                onSelect: () =>
                  executeCommand(APP_COMMANDS.WORKSPACE_CREATE_FOLDER),
              },
              {
                id: "save-file",
                label: "Сохранить",
                shortcut:
                  APP_COMMAND_SHORTCUTS[
                    APP_COMMANDS.WORKSPACE_SAVE_ACTIVE_FILE
                  ],
                disabled: !activeFile,
                onSelect: () =>
                  executeCommand(APP_COMMANDS.WORKSPACE_SAVE_ACTIVE_FILE),
              },
            ],
          },
        ],
      },
      {
        id: "edit",
        label: "Правка",
        sections: [
          {
            id: "edit-main",
            items: [
              {
                id: "rename-node",
                label: "Переименовать",
                disabled: !canRenameSelectedNode,
                onSelect: () => dispatchExplorerAction("rename"),
              },
              {
                id: "delete-node",
                label: "Удалить",
                disabled: !canDeleteSelectedNode,
                onSelect: () => dispatchExplorerAction("delete"),
              },
            ],
          },
        ],
      },
      {
        id: "view",
        label: "Вид",
        sections: [
          {
            id: "view-main",
            items: [
              {
                id: "open-search",
                label: activeSearchQuery
                  ? "Открыть поиск и фильтр"
                  : "Открыть поиск",
                onSelect: openSearch,
              },
              {
                id: "toggle-terminal",
                label: isTerminalVisible
                  ? "Скрыть терминал"
                  : "Показать терминал",
                shortcut:
                  APP_COMMAND_SHORTCUTS[APP_COMMANDS.PANEL_TOGGLE_TERMINAL],
                onSelect: () =>
                  executeCommand(APP_COMMANDS.PANEL_TOGGLE_TERMINAL),
              },
              {
                id: "open-visual-settings",
                label: "Настройки внешнего вида",
                onSelect: onOpenVisualSettings,
              },
              {
                id: "refresh-tree",
                label:
                  source === "cloud"
                    ? "Обновить облачные проекты"
                    : "Обновить проводник",
                disabled: !canRefreshExplorer,
                onSelect: () => dispatchExplorerAction("refresh"),
              },
              {
                id: "collapse-tree",
                label:
                  source === "cloud"
                    ? "Свернуть активный проект"
                    : "Свернуть всё в проводнике",
                disabled: !canCollapseExplorer,
                onSelect: () => dispatchExplorerAction("collapse-all"),
              },
            ],
          },
        ],
      },
      {
        id: "terminal",
        label: "Терминал",
        sections: [
          {
            id: "terminal-main",
            items: [
              {
                id: "terminal-new",
                label: "Новый терминал",
                shortcut: APP_COMMAND_SHORTCUTS[APP_COMMANDS.TERMINAL_CREATE],
                onSelect: () => executeCommand(APP_COMMANDS.TERMINAL_CREATE),
              },
              {
                id: "terminal-open",
                label: isTerminalVisible
                  ? "Показать терминал"
                  : "Открыть терминал",
                shortcut:
                  APP_COMMAND_SHORTCUTS[APP_COMMANDS.PANEL_TOGGLE_TERMINAL],
                onSelect: () =>
                  isTerminalVisible ? focusTerminal() : openTerminal(),
              },
              {
                id: "terminal-focus",
                label: "Фокус на терминале",
                disabled: !hasTerminalSession,
                onSelect: focusTerminal,
              },
              {
                id: "terminal-clear",
                label: "Очистить терминал",
                disabled: !isTerminalReady,
                onSelect: () => clearTerminal(activeTerminalId),
              },
              {
                id: "terminal-interrupt",
                label: "Прервать терминал",
                disabled: !hasTerminalSession,
                onSelect: () => interruptTerminal(activeTerminalId),
              },
              {
                id: "terminal-close-active",
                label: "Закрыть активный терминал",
                disabled: !hasTerminalSession,
                onSelect: () =>
                  activeTerminalId ? closeTerminal(activeTerminalId) : undefined,
              },
            ],
          },
          ...(terminalCreateProfileItems.length > 0
            ? [
                {
                  id: "terminal-create-profiles",
                  title: TOP_BAR_STRINGS.terminalProfiles,
                  items: terminalCreateProfileItems,
                },
              ]
            : []),
          ...(terminalDefaultProfileItems.length > 0
            ? [
                {
                  id: "terminal-default-profile",
                  title:
                    terminalProfileDiscoveryStatus === "loading"
                      ? TOP_BAR_STRINGS.terminalProfilesLoading
                      : TOP_BAR_STRINGS.defaultTerminalProfile,
                  items: terminalDefaultProfileItems,
                },
              ]
            : []),
          ...(terminalSessions.length > 1
            ? [
                {
                  id: "terminal-sessions",
                  title: "Сессии",
                  items: terminalSessions.map((session) => ({
                    id: `terminal-session-${session.id}`,
                    label: `${session.id === activeTerminalId ? TOP_BAR_STRINGS.activeSessionPrefix : ""}${session.title}`,
                    onSelect: () => activateTerminal(session.id),
                  })),
                },
              ]
            : []),
        ],
      },
      {
        id: "run",
        label: "Запуск",
        sections: [
          {
            id: "run-main",
            items: [
              {
                id: "run-active",
                label: isRunning ? "Запуск уже выполняется" : "Запустить",
                shortcut:
                  APP_COMMAND_SHORTCUTS[
                    isRunning ? APP_COMMANDS.RUN_STOP : APP_COMMANDS.RUN_START
                  ],
                disabled: !isRunning && !canRunActiveTarget,
                onSelect: () =>
                  executeCommand(
                    isRunning ? APP_COMMANDS.RUN_STOP : APP_COMMANDS.RUN_START,
                  ),
              },
              {
                id: "rerun-active",
                label: "Перезапустить",
                disabled: !currentRunSessionCanRerun || isRunning,
                onSelect: rerun,
              },
              {
                id: "edit-configurations",
                label: "Изменить конфигурации...",
                onSelect: openRunConfigurationDialog,
              },
            ],
          },
        ],
      },
    ],
    [
      activeCloudProjectId,
      activeFile,
      activeSearchQuery,
      activeTerminalId,
      activateTerminal,
      canCollapseExplorer,
      canCreateFile,
      canCreateFolder,
      canCreateProject,
      canDeleteSelectedNode,
      canRenameSelectedNode,
      canRefreshExplorer,
      canRunActiveTarget,
      clearTerminal,
      closeTerminal,
      currentRunSessionCanRerun,
      dispatchExplorerAction,
      executeCommand,
      focusTerminal,
      handleOpenCloudProjectDraft,
      hasTerminalSession,
      interruptTerminal,
      isRunning,
      isTerminalReady,
      isTerminalVisible,
      onOpenVisualSettings,
      openRunConfigurationDialog,
      openSearch,
      openTerminal,
      rerun,
      source,
      terminalCreateProfileItems,
      terminalDefaultProfileItems,
      terminalProfileDiscoveryStatus,
      terminalSessions,
    ],
  );
}
