export const APP_COMMANDS = {
  WORKSPACE_OPEN_FOLDER: "workspace.openFolder",
  WORKSPACE_SAVE_ACTIVE_FILE: "workspace.saveActiveFile",
  WORKSPACE_CREATE_FILE: "workspace.createFile",
  WORKSPACE_CREATE_FOLDER: "workspace.createFolder",
  PANEL_TOGGLE_TERMINAL: "panel.toggleTerminal",
  TERMINAL_CREATE: "terminal.create",
  RUN_START: "run.start",
  RUN_STOP: "run.stop",
};

function isPrimaryModifier(input) {
  return Boolean(input.control || input.meta);
}

function normalizeKey(input) {
  return `${input.key ?? ""}`.toLowerCase();
}

export function resolveAppCommandFromInput(input) {
  if (!input || input.type !== "keyDown") {
    return null;
  }

  const primaryModifier = isPrimaryModifier(input);
  const key = normalizeKey(input);

  if (primaryModifier && !input.alt && !input.shift && (input.code === "KeyO" || key === "o")) {
    return APP_COMMANDS.WORKSPACE_OPEN_FOLDER;
  }

  if (primaryModifier && !input.alt && !input.shift && (input.code === "KeyS" || key === "s")) {
    return APP_COMMANDS.WORKSPACE_SAVE_ACTIVE_FILE;
  }

  if (primaryModifier && !input.alt && !input.shift && (input.code === "KeyN" || key === "n")) {
    return APP_COMMANDS.WORKSPACE_CREATE_FILE;
  }

  if (primaryModifier && !input.alt && input.shift && (input.code === "KeyN" || key === "n")) {
    return APP_COMMANDS.WORKSPACE_CREATE_FOLDER;
  }

  if (primaryModifier && !input.alt && !input.shift && (input.code === "KeyJ" || key === "j")) {
    return APP_COMMANDS.PANEL_TOGGLE_TERMINAL;
  }

  if (
    primaryModifier &&
    !input.alt &&
    input.shift &&
    (input.code === "Backquote" || key === "`")
  ) {
    return APP_COMMANDS.TERMINAL_CREATE;
  }

  if (!input.control && !input.meta && !input.alt && !input.shift && input.key === "F5") {
    return APP_COMMANDS.RUN_START;
  }

  if (!input.control && !input.meta && !input.alt && input.shift && input.key === "F5") {
    return APP_COMMANDS.RUN_STOP;
  }

  return null;
}
