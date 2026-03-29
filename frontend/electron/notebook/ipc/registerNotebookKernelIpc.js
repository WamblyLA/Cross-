import { createPythonJupyterBridge } from "../bridge/PythonJupyterBridge.js";
import { createKernelDiscoveryService } from "../discovery/KernelDiscoveryService.js";
import { createNotebookExecutionMaterializer } from "../materialization/NotebookExecutionMaterializer.js";
import { createNotebookSessionService } from "../session/NotebookSessionService.js";

const HANDLERS = [
  "notebook:list-kernels",
  "notebook:refresh-kernels",
  "notebook:start-session",
  "notebook:execute-cell",
  "notebook:interrupt-kernel",
  "notebook:restart-kernel",
  "notebook:shutdown-session",
];

export function registerNotebookKernelIpc({ app, ipcMain, sendToRenderer }) {
  const bridge = createPythonJupyterBridge();
  const discoveryService = createKernelDiscoveryService({ bridge });
  const materializer = createNotebookExecutionMaterializer({ app });
  const sessionService = createNotebookSessionService({
    bridge,
    materializer,
    sendToRenderer,
  });

  ipcMain.handle("notebook:list-kernels", async (_, options) => {
    return discoveryService.listKernels(options ?? {});
  });

  ipcMain.handle("notebook:refresh-kernels", async (_, options) => {
    return discoveryService.refreshKernels(options ?? {});
  });

  ipcMain.handle("notebook:start-session", async (_, payload) => {
    return sessionService.startSession(payload);
  });

  ipcMain.handle("notebook:execute-cell", async (_, payload) => {
    return sessionService.executeCell(payload);
  });

  ipcMain.handle("notebook:interrupt-kernel", async (_, runtimeId) => {
    return sessionService.interruptSession(runtimeId);
  });

  ipcMain.handle("notebook:restart-kernel", async (_, runtimeId) => {
    return sessionService.restartSession(runtimeId);
  });

  ipcMain.handle("notebook:shutdown-session", async (_, runtimeId) => {
    return sessionService.shutdownSession(runtimeId);
  });

  return {
    async dispose() {
      for (const handler of HANDLERS) {
        ipcMain.removeHandler(handler);
      }

      await sessionService.disposeAll();
      discoveryService.clearCache();
    },
  };
}
