import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fsSync from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { registerWindowCommandRouting } from "./commands/registerWindowCommandRouting.js";
import { startFolderWatcher } from "./folderWatcher.js";
import { createLinkBindingStore } from "./linking/linkBindingStore.js";
import { registerLinkingIpc } from "./linking/registerLinkingIpc.js";
import { registerNotebookKernelIpc } from "./notebook/ipc/registerNotebookKernelIpc.js";
import { createRunSubsystem } from "./run/index.js";
import { createTerminalPreferencesStore } from "./terminal/terminalPreferencesStore.js";
import { createTerminalProfileService } from "./terminal/terminalProfileService.js";
import { createTerminalSessionService } from "./terminal/terminalSessionService.js";
import { registerTerminalIpc } from "./terminal/registerTerminalIpc.js";

const require = createRequire(import.meta.url);

let nodePty = null;
let nodePtyLoadError = null;

try {
  nodePty = require("node-pty");
} catch (error) {
  nodePtyLoadError = error;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let currentWatcher = null;
let watchedRootPath = null;

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function getInitialTerminalCwd() {
  if (watchedRootPath && fsSync.existsSync(watchedRootPath)) {
    return watchedRootPath;
  }

  return process.cwd();
}

const notebookKernelIpc = registerNotebookKernelIpc({
  app,
  ipcMain,
  sendToRenderer,
});
const runSubsystem = createRunSubsystem({
  app,
  nodePty,
  nodePtyLoadError,
  sendToRenderer,
});
const terminalPreferencesStore = createTerminalPreferencesStore({ app });
const linkBindingStore = createLinkBindingStore({ app });
const terminalProfileService = createTerminalProfileService({
  preferencesStore: terminalPreferencesStore,
  onProfilesChanged(snapshot) {
    sendToRenderer("terminal:profiles-updated", snapshot);
  },
});
const terminalSessionService = createTerminalSessionService({
  nodePty,
  nodePtyLoadError,
  profileService: terminalProfileService,
  getInitialTerminalCwd,
  sendToRenderer,
});

function createWindow() {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  registerWindowCommandRouting(mainWindow, sendToRenderer);
}

function sortEntries(entries) {
  return entries.sort((left, right) => {
    if (left.isDirectory !== right.isDirectory) {
      return left.isDirectory ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "ru");
  });
}

function normalizePathCase(filePath) {
  const resolvedPath = path.resolve(filePath);
  return process.platform === "win32" ? resolvedPath.toLowerCase() : resolvedPath;
}

function isSamePath(leftPath, rightPath) {
  return normalizePathCase(leftPath) === normalizePathCase(rightPath);
}

function isPathInsideRoot(targetPath, rootPath) {
  const normalizedTarget = normalizePathCase(targetPath);
  const normalizedRoot = normalizePathCase(rootPath);

  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}${path.sep.toLowerCase()}`)
  );
}

async function readFolder(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  return sortEntries(
    entries.map((entry) => ({
      name: entry.name,
      path: path.join(folderPath, entry.name),
      isDirectory: entry.isDirectory(),
    })),
  );
}

async function closeFolderWatcher() {
  if (!currentWatcher) {
    return;
  }

  await currentWatcher.close();
  currentWatcher = null;
}

async function restartFolderWatcher(folderPath) {
  await closeFolderWatcher();

  watchedRootPath = folderPath ?? null;

  if (!folderPath) {
    return;
  }

  currentWatcher = startFolderWatcher(folderPath, (payload) => {
    sendToRenderer("folder:changed", payload);
  });
}

async function withWorkspaceWatcherPaused(targetPath, operation) {
  const shouldPauseWatcher =
    watchedRootPath !== null && isPathInsideRoot(targetPath, watchedRootPath);

  if (!shouldPauseWatcher) {
    return operation();
  }

  const rootPath = watchedRootPath;

  await closeFolderWatcher();

  try {
    return await operation();
  } finally {
    await restartFolderWatcher(rootPath);
  }
}

async function withWorkspaceWatcherPausedForPaths(targetPaths, operation) {
  const normalizedPaths = targetPaths.filter(Boolean);
  const shouldPauseWatcher =
    watchedRootPath !== null &&
    normalizedPaths.some((targetPath) => isPathInsideRoot(targetPath, watchedRootPath));

  if (!shouldPauseWatcher) {
    return operation();
  }

  const rootPath = watchedRootPath;

  await closeFolderWatcher();

  try {
    return await operation();
  } finally {
    await restartFolderWatcher(rootPath);
  }
}

function splitNameParts(entryName) {
  const parsed = path.parse(entryName);

  if (!parsed.ext) {
    return {
      stem: entryName,
      ext: "",
    };
  }

  return {
    stem: parsed.name,
    ext: parsed.ext,
  };
}

async function resolveAvailableTargetPath(targetDirectory, entryName) {
  const { stem, ext } = splitNameParts(entryName);
  let suffixIndex = 0;

  while (true) {
    const suffix = suffixIndex === 0 ? " copy" : ` copy ${suffixIndex + 1}`;
    const candidateName = `${stem}${suffix}${ext}`;
    const candidatePath = path.join(targetDirectory, candidateName);

    if (!fsSync.existsSync(candidatePath)) {
      return candidatePath;
    }

    suffixIndex += 1;
  }
}

async function resolvePasteTargetPath(sourcePath, targetDirectory) {
  const initialCandidate = path.join(targetDirectory, path.basename(sourcePath));

  if (!fsSync.existsSync(initialCandidate)) {
    return initialCandidate;
  }

  return resolveAvailableTargetPath(targetDirectory, path.basename(sourcePath));
}

async function copyFileSystemEntry(sourcePath, targetDirectory) {
  const targetPath = await resolvePasteTargetPath(sourcePath, targetDirectory);
  const sourceStat = await fs.stat(sourcePath);

  if (sourceStat.isDirectory()) {
    await fs.cp(sourcePath, targetPath, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
  } else {
    await fs.copyFile(sourcePath, targetPath, fsSync.constants.COPYFILE_EXCL);
  }

  return targetPath;
}

async function removeFileSystemEntry(targetPath) {
  const stat = await fs.stat(targetPath);

  if (stat.isDirectory()) {
    await fs.rm(targetPath, { recursive: true, force: true });
  } else {
    await fs.unlink(targetPath);
  }
}

async function moveFileSystemEntry(sourcePath, targetDirectory) {
  if (isSamePath(path.dirname(sourcePath), targetDirectory)) {
    return sourcePath;
  }

  const targetPath = await resolvePasteTargetPath(sourcePath, targetDirectory);

  try {
    await fs.rename(sourcePath, targetPath);
    return targetPath;
  } catch (error) {
    if (!(error instanceof Error) || !`${error.message}`.toLowerCase().includes("cross-device")) {
      const code = error && typeof error === "object" ? error.code : null;

      if (code !== "EXDEV") {
        throw error;
      }
    }

    const copiedPath = await copyFileSystemEntry(sourcePath, targetDirectory);
    await removeFileSystemEntry(sourcePath);
    return copiedPath;
  }
}

app.whenReady().then(() => {
  createWindow();
  registerTerminalIpc({
    ipcMain,
    terminalSessionService,
    terminalProfileService,
  });
  registerLinkingIpc({
    ipcMain,
    linkBindingStore,
  });
  void terminalProfileService.startDiscovery();

  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("window:toggle-maximize", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle("window:close", () => {
    mainWindow?.close();
  });

  ipcMain.handle("folder:open", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const folderPath = result.filePaths[0];

    await restartFolderWatcher(folderPath);

    return {
      folderPath,
      files: await readFolder(folderPath),
    };
  });

  ipcMain.handle("folder:list", async (_, folderPath) => {
    return readFolder(folderPath);
  });

  ipcMain.handle("file:read", async (_, filePath) => {
    return fs.readFile(filePath, "utf-8");
  });

  ipcMain.handle("file:write", async (_, filePath, content) => {
    await fs.writeFile(filePath, content ?? "", "utf-8");
    return { success: true };
  });

  ipcMain.handle("file:create", async (_, parentPath, name, isFolder) => {
    const trimmedName = name?.trim();

    if (!trimmedName) {
      throw new Error("Имя не может быть пустым.");
    }

    const fullPath = path.join(parentPath, trimmedName);

    if (fsSync.existsSync(fullPath)) {
      throw new Error("Такой элемент уже существует.");
    }

    if (isFolder) {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.writeFile(fullPath, "", "utf-8");
    }

    return { success: true, path: fullPath };
  });

  ipcMain.handle("file:rename", async (_, targetPath, newName) => {
    const trimmedName = newName?.trim();

    if (!trimmedName) {
      throw new Error("Имя не может быть пустым.");
    }

    const nextPath = path.join(path.dirname(targetPath), trimmedName);

    if (isSamePath(targetPath, nextPath)) {
      return { success: true, path: targetPath };
    }

    if (fsSync.existsSync(nextPath)) {
      throw new Error("Элемент с таким именем уже существует.");
    }

    await withWorkspaceWatcherPaused(targetPath, async () => {
      await fs.rename(targetPath, nextPath);
    });

    return { success: true, path: nextPath };
  });

  ipcMain.handle("file:remove", async (_, targetPath) => {
    await withWorkspaceWatcherPaused(targetPath, async () => {
      await removeFileSystemEntry(targetPath);
    });

    return { success: true };
  });

  ipcMain.handle("file:copy-many", async (_, sourcePaths, targetDirectory) => {
    if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) {
      return { success: true, paths: [] };
    }

    if (!targetDirectory || !fsSync.existsSync(targetDirectory)) {
      throw new Error("Целевая папка не найдена.");
    }

    const createdPaths = await withWorkspaceWatcherPausedForPaths(
      [...sourcePaths, targetDirectory],
      async () => {
        const results = [];

        for (const sourcePath of sourcePaths) {
          const resolvedSourcePath = path.resolve(sourcePath);

          if (isPathInsideRoot(targetDirectory, resolvedSourcePath)) {
            throw new Error("Нельзя копировать папку в неё саму или в её вложенную папку.");
          }

          results.push(await copyFileSystemEntry(resolvedSourcePath, targetDirectory));
        }

        return results;
      },
    );

    return { success: true, paths: createdPaths };
  });

  ipcMain.handle("file:move-many", async (_, sourcePaths, targetDirectory) => {
    if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) {
      return { success: true, paths: [] };
    }

    if (!targetDirectory || !fsSync.existsSync(targetDirectory)) {
      throw new Error("Целевая папка не найдена.");
    }

    const movedPaths = await withWorkspaceWatcherPausedForPaths(
      [...sourcePaths, targetDirectory],
      async () => {
        const results = [];

        for (const sourcePath of sourcePaths) {
          const resolvedSourcePath = path.resolve(sourcePath);

          if (isPathInsideRoot(targetDirectory, resolvedSourcePath)) {
            throw new Error("Нельзя перемещать папку в неё саму или в её вложенную папку.");
          }

          results.push(await moveFileSystemEntry(resolvedSourcePath, targetDirectory));
        }

        return results;
      },
    );

    return { success: true, paths: movedPaths };
  });

  ipcMain.handle("run:list-configurations", async (_, workspaceDescriptor) => {
    return runSubsystem.listConfigurations(workspaceDescriptor);
  });

  ipcMain.handle("run:create-configuration", async (_, workspaceDescriptor, configurationInput) => {
    return runSubsystem.createConfiguration(workspaceDescriptor, configurationInput);
  });

  ipcMain.handle("run:update-configuration", async (_, workspaceDescriptor, configurationInput) => {
    return runSubsystem.updateConfiguration(workspaceDescriptor, configurationInput);
  });

  ipcMain.handle("run:delete-configuration", async (_, workspaceDescriptor, configurationId) => {
    return runSubsystem.deleteConfiguration(workspaceDescriptor, configurationId);
  });

  ipcMain.handle("run:select-configuration", async (_, workspaceDescriptor, configurationId) => {
    return runSubsystem.selectConfiguration(workspaceDescriptor, configurationId);
  });

  ipcMain.handle("run:list-python-interpreters", async (_, options) => {
    return {
      interpreters: runSubsystem.listPythonInterpreters(options ?? {}),
    };
  });

  ipcMain.handle("run:list-cpp-toolchains", async () => {
    return {
      toolchains: runSubsystem.listCppToolchains(),
    };
  });

  ipcMain.handle("run:start", async (_, launchRequest) => {
    return {
      session: await runSubsystem.startRun(launchRequest),
    };
  });

  ipcMain.handle("run:stop", async () => {
    return {
      session: await runSubsystem.stopRun(),
    };
  });

  ipcMain.handle("run:rerun", async () => {
    return {
      session: await runSubsystem.rerun(),
    };
  });

  ipcMain.handle("run:write", async (_, sessionId, data) => {
    return runSubsystem.writeToRun(sessionId, data);
  });

  ipcMain.handle("run:resize", async (_, sessionId, cols, rows) => {
    return runSubsystem.resizeRun(sessionId, cols, rows);
  });

  ipcMain.handle("run:get-current-session", async () => {
    return {
      session: runSubsystem.getCurrentSession(),
    };
  });
});

app.on("before-quit", async () => {
  await closeFolderWatcher();
  await notebookKernelIpc.dispose();
  runSubsystem.dispose();
  terminalSessionService.disposeAllSessions();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
