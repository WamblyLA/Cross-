export function registerTerminalIpc({
  ipcMain,
  terminalSessionService,
  terminalProfileService,
}) {
  ipcMain.handle("terminal:create", async (_, options) => {
    return terminalSessionService.createTerminalSession(options ?? {});
  });

  ipcMain.handle("terminal:ensure", async (_, terminalId) => {
    return terminalSessionService.ensureTerminalSession(terminalId ?? null);
  });

  ipcMain.handle("terminal:list", async () => {
    return terminalSessionService.listTerminalSessions();
  });

  ipcMain.handle("terminal:activate", async (_, terminalId) => {
    return terminalSessionService.activateTerminalSession(terminalId);
  });

  ipcMain.handle("terminal:close", async (_, terminalId) => {
    return terminalSessionService.closeTerminalSession(terminalId);
  });

  ipcMain.handle("terminal:write", async (_, terminalId, data) => {
    return terminalSessionService.writeToTerminal(terminalId, data);
  });

  ipcMain.handle("terminal:resize", async (_, terminalId, cols, rows) => {
    return terminalSessionService.resizeTerminal(terminalId, cols, rows);
  });

  ipcMain.handle("terminal:interrupt", async (_, terminalId) => {
    return terminalSessionService.interruptTerminal(terminalId);
  });

  ipcMain.handle("terminal:clear", async (_, terminalId) => {
    return terminalSessionService.clearTerminal(terminalId);
  });

  ipcMain.handle("terminal:message", async (_, terminalId, text) => {
    return terminalSessionService.printTerminalMessage(text, terminalId);
  });

  ipcMain.handle("terminal:list-profiles", async () => {
    return terminalProfileService.listProfiles();
  });

  ipcMain.handle("terminal:set-default-profile", async (_, profileId) => {
    return terminalProfileService.setDefaultProfile(profileId);
  });
}
