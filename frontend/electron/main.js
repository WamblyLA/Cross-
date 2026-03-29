import { spawnSync } from "child_process";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fsSync from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { startFolderWatcher } from "./folderWatcher.js";
import { createNotebookKernelManager } from "./notebookKernel.js";
import { createRunSubsystem } from "./run/index.js";

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

const CLEAR_TERMINAL_SEQUENCE = "\u001b[2J\u001b[3J\u001b[H";
const DEFAULT_TERMINAL_COLS = 120;
const DEFAULT_TERMINAL_ROWS = 30;

let mainWindow = null;
let currentWatcher = null;
let watchedRootPath = null;
let terminalSessions = new Map();
let terminalOrder = [];
let defaultShellTerminalId = null;
let terminalSize = {
  cols: DEFAULT_TERMINAL_COLS,
  rows: DEFAULT_TERMINAL_ROWS,
};
const notebookKernelManager = createNotebookKernelManager({
  nodePty,
  nodePtyLoadError,
  sendToRenderer,
});
const runSubsystem = createRunSubsystem({
  app,
  nodePty,
  nodePtyLoadError,
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
}

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
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
    const suffix =
      suffixIndex === 0 ? " copy" : ` copy ${suffixIndex + 1}`;
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

function getInitialTerminalCwd() {
  if (watchedRootPath && fsSync.existsSync(watchedRootPath)) {
    return watchedRootPath;
  }

  return process.cwd();
}

function getShellCandidate() {
  if (process.platform === "win32") {
    const powershellExists = spawnSync("where.exe", ["powershell.exe"], {
      encoding: "utf-8",
      windowsHide: true,
    });

    if (powershellExists.status === 0) {
      return {
        command: "powershell.exe",
        args: ["-NoLogo"],
        kind: "shell",
        shellType: "powershell",
        label: "PowerShell",
      };
    }

    return {
      command: "cmd.exe",
      args: [],
      kind: "shell",
      shellType: "cmd",
      label: "Command Prompt",
    };
  }

  const shellCommand = process.env.SHELL || "/bin/bash";

  return {
    command: shellCommand,
    args: [],
    kind: "shell",
    shellType: "posix",
    label: path.basename(shellCommand),
  };
}

function buildNodePtyUnavailableError() {
  const baseMessage =
    "node-pty не удалось загрузить для Electron. Выполните npm run rebuild:native -w ./frontend. Для Windows также нужны Visual Studio Build Tools.";
  const details = nodePtyLoadError instanceof Error ? nodePtyLoadError.message : null;

  return new Error(details ? `${baseMessage} Подробности: ${details}` : baseMessage);
}

function createTerminalId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSpawnId() {
  return createTerminalId("spawn");
}

function resolveExecutablePath(command) {
  if (!command) {
    return null;
  }

  if (path.isAbsolute(command) && fsSync.existsSync(command)) {
    return command;
  }

  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const extensions =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .map((extension) => extension.trim().toLowerCase())
          .filter(Boolean)
      : [""];

  for (const entry of pathEntries) {
    const directCandidate = path.join(entry, command);

    if (fsSync.existsSync(directCandidate)) {
      return directCandidate;
    }

    for (const extension of extensions) {
      const candidatePath = path.join(entry, `${command}${extension}`);

      if (fsSync.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

function buildTerminalMeta(session) {
  return {
    id: session.id,
    title: session.title,
    shellLabel: session.label,
    kind: "shell",
  };
}

function emitTerminalData(terminalId, text) {
  if (!text) {
    return;
  }

  sendToRenderer("terminal:data", {
    terminalId,
    text,
  });
}

function emitTerminalStatus(payload) {
  sendToRenderer("terminal:status", payload);
}

function getTerminalSession(terminalId) {
  if (!terminalId) {
    return null;
  }

  return terminalSessions.get(terminalId) ?? null;
}

function ensureShellTerminal() {
  const defaultShellSession = getTerminalSession(defaultShellTerminalId);

  if (defaultShellSession) {
    return {
      terminal: buildTerminalMeta(defaultShellSession),
    };
  }

  return {
    terminal: createShellSession(),
  };
}

function requireTerminalSession(terminalId) {
  const session = getTerminalSession(terminalId);

  if (!session) {
    throw new Error("Терминал был закрыт. Откройте его заново.");
  }

  return session;
}

function pickNextDefaultShellTerminal() {
  const nextShellSession = terminalOrder
    .map((terminalId) => terminalSessions.get(terminalId) ?? null)
    .find((session) => session?.mode === "shell");

  defaultShellTerminalId = nextShellSession?.id ?? null;
}

function removeTerminalSessionState(terminalId) {
  terminalSessions.delete(terminalId);
  terminalOrder = terminalOrder.filter((id) => id !== terminalId);

  if (defaultShellTerminalId === terminalId) {
    pickNextDefaultShellTerminal();
  }
}

function handleTerminalExit(terminalId, spawnId, event) {
  const session = getTerminalSession(terminalId);

  if (!session || session.disposed || session.spawnId !== spawnId) {
    return;
  }

  const exitCode = Number.isInteger(event?.exitCode) ? event.exitCode : 0;

  session.pty = null;
  removeTerminalSessionState(terminalId);

  emitTerminalStatus({
    type: "closed",
    terminalId,
  });
}

function disposePty(session) {
  if (!session?.pty) {
    return;
  }

  try {
    session.pty.kill();
  } catch {
    // DONE
  }

  session.pty = null;
}

function resizePty(session, cols, rows) {
  if (!session?.pty) {
    return;
  }

  try {
    session.pty.resize(cols, rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : `${error ?? ""}`;
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("already exited") ||
      normalizedMessage.includes("cannot resize") ||
      normalizedMessage.includes("closed")
    ) {
      session.pty = null;
      return;
    }

    throw error;
  }
}

function disposeTerminalSession(terminalId, { notifyRenderer = true } = {}) {
  const session = getTerminalSession(terminalId);

  if (!session) {
    return;
  }

  session.disposed = true;

  disposePty(session);
  removeTerminalSessionState(terminalId);

  if (notifyRenderer) {
    emitTerminalStatus({
      type: "closed",
      terminalId,
    });
  }
}

function emitTerminalChunk(terminalId, text) {
  if (!text) {
    return;
  }

  emitTerminalData(terminalId, text);
}

function handleTerminalChunk(session, chunk) {
  emitTerminalChunk(session.id, chunk);
}

function createPtySession({
  terminalId = createTerminalId("terminal"),
  mode,
  title,
  command,
  args,
  cwd,
  label,
  shellType = null,
}) {
  if (!nodePty) {
    throw buildNodePtyUnavailableError();
  }

  const existingSession = getTerminalSession(terminalId);
  const session =
    existingSession ??
    {
      id: terminalId,
      mode,
      title,
      label,
      shellType,
      pty: null,
      spawnId: null,
      disposed: false,
    };

  if (existingSession?.pty) {
    disposePty(existingSession);
  }

  const pty = nodePty.spawn(command, args, {
    cwd,
    cols: terminalSize.cols,
    rows: terminalSize.rows,
    env: {
      ...process.env,
      TERM: process.platform === "win32" ? "xterm" : "xterm-256color",
    },
    name: process.platform === "win32" ? "xterm" : "xterm-256color",
    useConpty: process.platform === "win32",
  });
  const spawnId = createSpawnId();
  session.mode = mode;
  session.title = title;
  session.label = label;
  session.shellType = shellType;
  session.pty = pty;
  session.spawnId = spawnId;
  session.disposed = false;

  pty.onData((chunk) => {
    const currentSession = getTerminalSession(terminalId);

    if (!currentSession || currentSession.spawnId !== spawnId) {
      return;
    }

    handleTerminalChunk(currentSession, chunk);
  });

  pty.onExit((event) => {
    handleTerminalExit(terminalId, spawnId, event);
  });

  terminalSessions.set(terminalId, session);

  if (!terminalOrder.includes(terminalId)) {
    terminalOrder.push(terminalId);
  }

  return session;
}

function createShellSession() {
  const candidate = getShellCandidate();
  const terminalId = createTerminalId("terminal");
  const shellIndex =
    terminalOrder.filter((terminalIdValue) => {
      const session = terminalSessions.get(terminalIdValue);
      return session?.mode === "shell";
    }).length + 1;
  const title = shellIndex === 1 ? "Terminal" : `Terminal ${shellIndex}`;
  const session = createPtySession({
    terminalId,
    mode: "shell",
    title,
    command: candidate.command,
    args: candidate.args,
    cwd: getInitialTerminalCwd(),
    label: candidate.label,
    shellType: candidate.shellType,
  });

  if (!defaultShellTerminalId) {
    defaultShellTerminalId = session.id;
  }

  return buildTerminalMeta(session);
}

function listShellSessions() {
  return terminalOrder
    .map((terminalId) => terminalSessions.get(terminalId) ?? null)
    .filter((session) => session?.mode === "shell")
    .map((session) => buildTerminalMeta(session));
}

function getActiveShellTerminalId() {
  const activeSession = getTerminalSession(defaultShellTerminalId);

  if (activeSession?.mode === "shell") {
    return activeSession.id;
  }

  return listShellSessions()[0]?.id ?? null;
}

function buildShellSessionListPayload() {
  return {
    terminals: listShellSessions(),
    activeTerminalId: getActiveShellTerminalId(),
  };
}

function activateShellTerminalSession(terminalId) {
  const session = requireTerminalSession(terminalId);

  if (session.mode !== "shell") {
    throw new Error("Можно активировать только обычные терминальные сессии.");
  }

  defaultShellTerminalId = session.id;
  return buildShellSessionListPayload();
}

function ensureTerminalSession(terminalId = null) {
  if (terminalId) {
    return {
      terminal: buildTerminalMeta(requireTerminalSession(terminalId)),
    };
  }

  return ensureShellTerminal();
}

function interruptTerminalSession(terminalId) {
  const session = requireTerminalSession(terminalId);

  if (!session.pty) {
    return {
      success: true,
      terminal: buildTerminalMeta(session),
    };
  }

  session.pty.write("\u0003");

  return {
    success: true,
    terminal: buildTerminalMeta(session),
  };
}

app.whenReady().then(() => {
  createWindow();

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
      throw new Error("Name cannot be empty.");
    }

    const fullPath = path.join(parentPath, trimmedName);

    if (fsSync.existsSync(fullPath)) {
      throw new Error("That item already exists.");
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
      throw new Error("Name cannot be empty.");
    }

    const nextPath = path.join(path.dirname(targetPath), trimmedName);

    if (isSamePath(targetPath, nextPath)) {
      return { success: true, path: targetPath };
    }

    if (fsSync.existsSync(nextPath)) {
      throw new Error("An item with that name already exists.");
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
      throw new Error("Целевая папка для вставки не найдена.");
    }

    const createdPaths = await withWorkspaceWatcherPausedForPaths(
      [...sourcePaths, targetDirectory],
      async () => {
        const results = [];

        for (const sourcePath of sourcePaths) {
          const resolvedSourcePath = path.resolve(sourcePath);

          if (isPathInsideRoot(targetDirectory, resolvedSourcePath)) {
            throw new Error("Нельзя вставить папку в саму себя или во вложенную папку.");
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
      throw new Error("Целевая папка для вставки не найдена.");
    }

    const movedPaths = await withWorkspaceWatcherPausedForPaths(
      [...sourcePaths, targetDirectory],
      async () => {
        const results = [];

        for (const sourcePath of sourcePaths) {
          const resolvedSourcePath = path.resolve(sourcePath);

          if (isPathInsideRoot(targetDirectory, resolvedSourcePath)) {
            throw new Error("Нельзя переместить папку в саму себя или во вложенную папку.");
          }

          results.push(await moveFileSystemEntry(resolvedSourcePath, targetDirectory));
        }

        return results;
      },
    );

    return { success: true, paths: movedPaths };
  });

  ipcMain.handle("terminal:create", async () => {
    const terminal = createShellSession();
    defaultShellTerminalId = terminal.id;

    return {
      terminal,
    };
  });

  ipcMain.handle("terminal:ensure", async (_, terminalId) => {
    return ensureTerminalSession(terminalId ?? null);
  });

  ipcMain.handle("terminal:list", async () => {
    return buildShellSessionListPayload();
  });

  ipcMain.handle("terminal:activate", async (_, terminalId) => {
    return activateShellTerminalSession(terminalId);
  });

  ipcMain.handle("terminal:close", async (_, terminalId) => {
    disposeTerminalSession(terminalId);

    return { success: true };
  });

  ipcMain.handle("terminal:write", async (_, terminalId, data) => {
    const session = requireTerminalSession(terminalId);

    if (session?.pty) {
      session.pty.write(data);
    }

    return {
      success: true,
      terminal: buildTerminalMeta(session),
    };
  });

  ipcMain.handle("terminal:resize", async (_, terminalId, cols, rows) => {
    const session = requireTerminalSession(terminalId);
    const nextCols = Number.isFinite(cols) && cols > 0 ? Math.floor(cols) : terminalSize.cols;
    const nextRows = Number.isFinite(rows) && rows > 0 ? Math.floor(rows) : terminalSize.rows;

    terminalSize = {
      cols: nextCols,
      rows: nextRows,
    };

    resizePty(session, nextCols, nextRows);

    return { success: true };
  });

  ipcMain.handle("terminal:interrupt", async (_, terminalId) => {
    return interruptTerminalSession(terminalId);
  });

  ipcMain.handle("terminal:clear", async (_, terminalId) => {
    const session = requireTerminalSession(terminalId);
    emitTerminalData(session.id, CLEAR_TERMINAL_SEQUENCE);

    return {
      success: true,
      terminal: buildTerminalMeta(session),
    };
  });

  ipcMain.handle("terminal:message", async (_, terminalId, text) => {
    const session = requireTerminalSession(terminalId);
    emitTerminalData(session.id, `${text.endsWith("\n") ? text : `${text}\r\n`}`);

    return { success: true };
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

  ipcMain.handle("notebook:list-kernels", async (_, options) => {
    return notebookKernelManager.listKernels(options ?? {});
  });

  ipcMain.handle("notebook:refresh-kernels", async (_, options) => {
    return notebookKernelManager.refreshKernels(options ?? {});
  });

  ipcMain.handle("notebook:get-kernel-diagnostics", async (_, options) => {
    return notebookKernelManager.getKernelDiagnostics(options ?? {});
  });

  ipcMain.handle("notebook:execute-cell", async (_, payload) => {
    return notebookKernelManager.executeCell(payload);
  });

  ipcMain.handle("notebook:interrupt-kernel", async (_, notebookPath) => {
    return notebookKernelManager.interruptKernel(notebookPath);
  });

  ipcMain.handle("notebook:restart-kernel", async (_, payload) => {
    return notebookKernelManager.restartKernel(payload);
  });

  ipcMain.handle("notebook:release-kernel", async (_, notebookPath) => {
    return notebookKernelManager.releaseKernel(notebookPath);
  });
});

app.on("before-quit", async () => {
  await closeFolderWatcher();
  notebookKernelManager.disposeAll();
  runSubsystem.dispose();

  for (const terminalId of [...terminalOrder]) {
    disposeTerminalSession(terminalId, { notifyRenderer: false });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

