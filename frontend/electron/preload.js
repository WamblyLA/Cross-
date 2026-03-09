const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => "pong",
  openFolder: () => ipcRenderer.invoke("folder:open"),
  listFolder: (folderPath) => ipcRenderer.invoke("folder:list", folderPath),
  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("file:write", filePath, content),
  createFileSystemItem: (parentPath, name, isFolder) =>
    ipcRenderer.invoke("file:create", parentPath, name, isFolder),
  removeFileSystemItem: (targetPath) =>
    ipcRenderer.invoke("file:remove", targetPath),
  onFolderChanged: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("folder:changed", listener);
    return () => ipcRenderer.removeListener("folder:changed", listener);
  },
});
