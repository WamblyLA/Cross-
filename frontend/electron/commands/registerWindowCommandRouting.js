import { resolveAppCommandFromInput } from "./appCommands.js";

export function registerWindowCommandRouting(windowInstance, sendToRenderer) {
  if (!windowInstance?.webContents) {
    return;
  }

  windowInstance.webContents.on("before-input-event", (event, input) => {
    const commandId = resolveAppCommandFromInput(input);

    if (!commandId) {
      return;
    }

    event.preventDefault();
    sendToRenderer("app:command", {
      commandId,
    });
  });
}
