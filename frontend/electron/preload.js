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
  ensureTerminalSession: () => ipcRenderer.invoke("terminal:ensure"),
  writeToTerminal: (data) => ipcRenderer.invoke("terminal:write", data),
  resizeTerminal: (cols, rows) => ipcRenderer.invoke("terminal:resize", cols, rows),
  clearTerminal: () => ipcRenderer.invoke("terminal:clear"),
  printTerminalMessage: (text) => ipcRenderer.invoke("terminal:message", text),
  runPythonInTerminal: (filePath) => ipcRenderer.invoke("terminal:run-python", filePath),
  listNotebookKernels: (options) => ipcRenderer.invoke("notebook:list-kernels", options),
  refreshNotebookKernels: (options) => ipcRenderer.invoke("notebook:refresh-kernels", options),
  getNotebookKernelDiagnostics: (options) =>
    ipcRenderer.invoke("notebook:get-kernel-diagnostics", options),
  executeNotebookCell: (payload) => ipcRenderer.invoke("notebook:execute-cell", payload),
  interruptNotebookKernel: (notebookPath) =>
    ipcRenderer.invoke("notebook:interrupt-kernel", notebookPath),
  restartNotebookKernel: (payload) => ipcRenderer.invoke("notebook:restart-kernel", payload),
  releaseNotebookKernel: (notebookPath) => ipcRenderer.invoke("notebook:release-kernel", notebookPath),
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
  onNotebookKernelEvent: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("notebook:kernel-event", listener);
    return () => ipcRenderer.removeListener("notebook:kernel-event", listener);
  },
});
