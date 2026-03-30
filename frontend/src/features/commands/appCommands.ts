export const APP_COMMANDS = {
  WORKSPACE_OPEN_FOLDER: "workspace.openFolder",
  WORKSPACE_SAVE_ACTIVE_FILE: "workspace.saveActiveFile",
  WORKSPACE_CREATE_FILE: "workspace.createFile",
  WORKSPACE_CREATE_FOLDER: "workspace.createFolder",
  PANEL_TOGGLE_TERMINAL: "panel.toggleTerminal",
  TERMINAL_CREATE: "terminal.create",
  RUN_START: "run.start",
  RUN_STOP: "run.stop",
} as const;

export type AppCommandId = (typeof APP_COMMANDS)[keyof typeof APP_COMMANDS];

export const APP_COMMAND_SHORTCUTS: Record<AppCommandId, string> = {
  [APP_COMMANDS.WORKSPACE_OPEN_FOLDER]: "Ctrl+O",
  [APP_COMMANDS.WORKSPACE_SAVE_ACTIVE_FILE]: "Ctrl+S",
  [APP_COMMANDS.WORKSPACE_CREATE_FILE]: "Ctrl+N",
  [APP_COMMANDS.WORKSPACE_CREATE_FOLDER]: "Ctrl+Shift+N",
  [APP_COMMANDS.PANEL_TOGGLE_TERMINAL]: "Ctrl+J",
  [APP_COMMANDS.TERMINAL_CREATE]: "Ctrl+Shift+`",
  [APP_COMMANDS.RUN_START]: "F5",
  [APP_COMMANDS.RUN_STOP]: "Shift+F5",
};
