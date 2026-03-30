const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  ping: () => "pong",
  openFolder: () => ipcRenderer.invoke("folder:open"),
  listFolder: (folderPath) => ipcRenderer.invoke("folder:list", folderPath),
  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("file:write", filePath, content),
  createFileSystemItem: (parentPath, name, isFolder) =>
    ipcRenderer.invoke("file:create", parentPath, name, isFolder),
  renameFileSystemItem: (targetPath, newName) =>
    ipcRenderer.invoke("file:rename", targetPath, newName),
  removeFileSystemItem: (targetPath) => ipcRenderer.invoke("file:remove", targetPath),
  copyFileSystemItems: (sourcePaths, targetDirectory) =>
    ipcRenderer.invoke("file:copy-many", sourcePaths, targetDirectory),
  moveFileSystemItems: (sourcePaths, targetDirectory) =>
    ipcRenderer.invoke("file:move-many", sourcePaths, targetDirectory),
  ensureTerminalSession: (terminalId) => ipcRenderer.invoke("terminal:ensure", terminalId),
  createTerminalSession: (options) => ipcRenderer.invoke("terminal:create", options),
  listTerminalSessions: () => ipcRenderer.invoke("terminal:list"),
  activateTerminalSession: (terminalId) => ipcRenderer.invoke("terminal:activate", terminalId),
  closeTerminalSession: (terminalId) => ipcRenderer.invoke("terminal:close", terminalId),
  writeToTerminal: (data, terminalId) => ipcRenderer.invoke("terminal:write", terminalId ?? null, data),
  resizeTerminal: (cols, rows, terminalId) =>
    ipcRenderer.invoke("terminal:resize", terminalId ?? null, cols, rows),
  interruptTerminal: (terminalId) => ipcRenderer.invoke("terminal:interrupt", terminalId),
  clearTerminal: (terminalId) => ipcRenderer.invoke("terminal:clear", terminalId ?? null),
  printTerminalMessage: (text, terminalId) =>
    ipcRenderer.invoke("terminal:message", terminalId ?? null, text),
  listTerminalProfiles: () => ipcRenderer.invoke("terminal:list-profiles"),
  setDefaultTerminalProfile: (profileId) =>
    ipcRenderer.invoke("terminal:set-default-profile", profileId),
  listRunConfigurations: (workspaceDescriptor) =>
    ipcRenderer.invoke("run:list-configurations", workspaceDescriptor),
  createRunConfiguration: (workspaceDescriptor, configurationInput) =>
    ipcRenderer.invoke("run:create-configuration", workspaceDescriptor, configurationInput),
  updateRunConfiguration: (workspaceDescriptor, configurationInput) =>
    ipcRenderer.invoke("run:update-configuration", workspaceDescriptor, configurationInput),
  deleteRunConfiguration: (workspaceDescriptor, configurationId) =>
    ipcRenderer.invoke("run:delete-configuration", workspaceDescriptor, configurationId),
  selectRunConfiguration: (workspaceDescriptor, configurationId) =>
    ipcRenderer.invoke("run:select-configuration", workspaceDescriptor, configurationId),
  listRunPythonInterpreters: (options) =>
    ipcRenderer.invoke("run:list-python-interpreters", options),
  listRunCppToolchains: () => ipcRenderer.invoke("run:list-cpp-toolchains"),
  startRunSession: (launchRequest) => ipcRenderer.invoke("run:start", launchRequest),
  stopRunSession: () => ipcRenderer.invoke("run:stop"),
  rerunRunSession: () => ipcRenderer.invoke("run:rerun"),
  writeToRunSession: (sessionId, data) => ipcRenderer.invoke("run:write", sessionId, data),
  resizeRunSession: (sessionId, cols, rows) =>
    ipcRenderer.invoke("run:resize", sessionId, cols, rows),
  getCurrentRunSession: () => ipcRenderer.invoke("run:get-current-session"),
  listNotebookKernels: (options) => ipcRenderer.invoke("notebook:list-kernels", options),
  refreshNotebookKernels: (options) => ipcRenderer.invoke("notebook:refresh-kernels", options),
  startNotebookSession: (payload) => ipcRenderer.invoke("notebook:start-session", payload),
  executeNotebookCell: (payload) => ipcRenderer.invoke("notebook:execute-cell", payload),
  interruptNotebookKernel: (runtimeId) =>
    ipcRenderer.invoke("notebook:interrupt-kernel", runtimeId),
  restartNotebookKernel: (runtimeId) => ipcRenderer.invoke("notebook:restart-kernel", runtimeId),
  shutdownNotebookSession: (runtimeId) =>
    ipcRenderer.invoke("notebook:shutdown-session", runtimeId),
  onFolderChanged: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("folder:changed", listener);
    return () => ipcRenderer.removeListener("folder:changed", listener);
  },
  onTerminalData: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("terminal:data", listener);
    return () => ipcRenderer.removeListener("terminal:data", listener);
  },
  onTerminalStatus: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("terminal:status", listener);
    return () => ipcRenderer.removeListener("terminal:status", listener);
  },
  onTerminalProfilesUpdated: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("terminal:profiles-updated", listener);
    return () => ipcRenderer.removeListener("terminal:profiles-updated", listener);
  },
  onAppCommand: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("app:command", listener);
    return () => ipcRenderer.removeListener("app:command", listener);
  },
  onRunData: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("run:data", listener);
    return () => ipcRenderer.removeListener("run:data", listener);
  },
  onRunSession: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("run:session", listener);
    return () => ipcRenderer.removeListener("run:session", listener);
  },
  onNotebookKernelEvent: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("notebook:kernel-event", listener);
    return () => ipcRenderer.removeListener("notebook:kernel-event", listener);
  },
});
