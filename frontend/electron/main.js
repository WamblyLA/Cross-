import { spawnSync } from "child_process";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fsSync from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { startFolderWatcher } from "./folderWatcher.js";
import { createNotebookKernelManager } from "./notebookKernel.js";

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
const pythonCommand = "";
const resolvedFilePath = "";

let mainWindow = null;
let currentWatcher = null;
let watchedRootPath = null;
let terminalSessions = new Map();
let terminalOrder = [];
let defaultShellTerminalId = null;
let ideRunTerminalId = null;
let activeIdeRunTerminalId = null;
let terminalSize = {
  cols: DEFAULT_TERMINAL_COLS,
  rows: DEFAULT_TERMINAL_ROWS,
};
const notebookKernelManager = createNotebookKernelManager({
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
    "node-pty РЅРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР»СЏ Electron. Р’С‹РїРѕР»РЅРёС‚Рµ `npm run rebuild:native -w ./frontend`. Р”Р»СЏ Windows С‚Р°РєР¶Рµ РЅСѓР¶РЅС‹ Visual Studio Build Tools.";
  const details = nodePtyLoadError instanceof Error ? nodePtyLoadError.message : null;

  return new Error(details ? `${baseMessage} РџРѕРґСЂРѕР±РЅРѕСЃС‚Рё: ${details}` : baseMessage);
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

function isPythonLauncherPath(commandPath) {
  if (!commandPath) {
    return false;
  }

  const normalizedPath = path.normalize(commandPath).toLowerCase();
  return normalizedPath.endsWith(`${path.sep}launcher${path.sep}py.exe`) || path.basename(normalizedPath) === "py.exe";
}

function selectExistingPythonPath(candidates) {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const resolvedCandidate = path.resolve(candidate);

    if (fsSync.existsSync(resolvedCandidate) && !isPythonLauncherPath(resolvedCandidate)) {
      return resolvedCandidate;
    }
  }

  return null;
}

function extractPythonExecutableFromText(text) {
  if (!text) {
    return null;
  }

  return text.match(/[A-Za-z]:\\[^\r\n]*?python(?:w)?\.exe/gi)?.[0] ?? null;
}

function resolvePythonRuntimeFromLauncher(candidate) {
  const launcherListResult = spawnSync(candidate.command, ["-0p"], {
    encoding: "utf-8",
    windowsHide: true,
  });

  const combinedOutput = `${launcherListResult.stdout ?? ""}\n${launcherListResult.stderr ?? ""}`;
  const extractedPaths = combinedOutput
    .split(/\r?\n/)
    .map((line) => extractPythonExecutableFromText(line))
    .filter(Boolean);

  const preferredPath =
    combinedOutput
      .split(/\r?\n/)
      .find((line) => line.includes("*"))
      ?.match(/[A-Za-z]:\\[^\r\n]*?python(?:w)?\.exe/i)?.[0] ?? null;

  return selectExistingPythonPath([preferredPath, ...extractedPaths]);
}

function resolveWindowsPythonFromKnownLocations() {
  if (process.platform !== "win32") {
    return null;
  }

  const basePath = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Programs", "Python")
    : null;

  if (!basePath || !fsSync.existsSync(basePath)) {
    return null;
  }

  const installationCandidates = fsSync
    .readdirSync(basePath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^python/i.test(entry.name))
    .map((entry) => path.join(basePath, entry.name, "python.exe"))
    .sort((left, right) => right.localeCompare(left));

  return selectExistingPythonPath(installationCandidates);
}

function buildTerminalMeta(session) {
  return {
    id: session.id,
    title: session.title,
    shellLabel: session.label,
    kind: session.mode,
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
    throw new Error("РўРµСЂРјРёРЅР°Р» Р±С‹Р» Р·Р°РєСЂС‹С‚. РћС‚РєСЂРѕР№С‚Рµ РµРіРѕ Р·Р°РЅРѕРІРѕ.");
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
    // РРіРЅРѕСЂРёСЂСѓРµРј РѕС€РёР±РєРё Р·Р°РІРµСЂС€РµРЅРёСЏ PTY, РµСЃР»Рё РїСЂРѕС†РµСЃСЃ СѓР¶Рµ РѕСЃС‚Р°РЅРѕРІР»РµРЅ.
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

function quoteForPowerShell(value) {
  return `'${`${value}`.replace(/'/g, "''")}'`;
}

function quoteForCmd(value) {
  return `"${`${value}`.replace(/"/g, '""')}"`;
}

function quoteForPosixShell(value) {
  return `'${`${value}`.replace(/'/g, `'\\''`)}'`;
}

function buildPythonRunCommand({ shellType, cwd, filePath, commandName }) {
  switch (shellType) {
    case "powershell":
      return [
        `Set-Location -LiteralPath ${quoteForPowerShell(cwd)}`,
        `${commandName} ${quoteForPowerShell(filePath)}`,
      ].join("\r");
    case "cmd":
      return `cd /d ${quoteForCmd(cwd)}\r${commandName} ${quoteForCmd(filePath)}`;
    case "posix":
    default:
      return `cd ${quoteForPosixShell(cwd)} && ${commandName} ${quoteForPosixShell(filePath)}`;
  }
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
      isRunning: false,
      activeRun: null,
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

function ensureIdeRunTerminalSession() {
  const existingRunSession = ideRunTerminalId ? getTerminalSession(ideRunTerminalId) : null;

  if (existingRunSession?.pty) {
    return existingRunSession;
  }

  const candidate = getShellCandidate();
  const terminalId = existingRunSession?.id ?? createTerminalId("run");

  try {
    return createPtySession({
      terminalId,
      mode: "python-run",
      title: "Python",
      command: candidate.command,
      args: candidate.args,
      cwd: getInitialTerminalCwd(),
      label: candidate.label,
      shellType: candidate.shellType,
    });
  } catch (error) {
    ideRunTerminalId = existingRunSession?.id ?? null;
    activeIdeRunTerminalId = null;

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Failed to open the Python terminal.");

    const message =
      error instanceof Error ? error.message : "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ С‚РµСЂРјРёРЅР°Р» РґР»СЏ Python.";

    throw new Error(
      `РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСѓСЃС‚РёС‚СЊ Python (${path.basename(pythonCommand)}) РґР»СЏ С„Р°Р№Р»Р° ${resolvedFilePath}. ${message}`,
    );
  }
}

function ensureTerminalSession(terminalId = null) {
  if (terminalId) {
    return {
      terminal: buildTerminalMeta(requireTerminalSession(terminalId)),
    };
  }

  return ensureShellTerminal();
}

function findAvailablePythonInterpreter() {
  const candidates =
    process.platform === "win32"
      ? [
          {
            command: "py",
            args: ["-3"],
            checkArgs: ["-3", "--version"],
            label: "py -3",
          },
          {
            command: "python",
            args: [],
            checkArgs: ["--version"],
            label: "python",
          },
          {
            command: "python3",
            args: [],
            checkArgs: ["--version"],
            label: "python3",
          },
        ]
      : [
          {
            command: "python3",
            args: [],
            checkArgs: ["--version"],
            label: "python3",
          },
          {
            command: "python",
            args: [],
            checkArgs: ["--version"],
            label: "python",
          },
        ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.checkArgs, {
      encoding: "utf-8",
      windowsHide: true,
    });

    if (result.status === 0) {
      return {
        ...candidate,
        resolvedCommand: resolveExecutablePath(candidate.command),
      };
    }
  }

  return null;
}

function resolvePythonRuntime(candidate) {
  const probeResult = spawnSync(
    candidate.command,
    [...candidate.args, "-c", "import sys; print(getattr(sys, '_base_executable', '') or sys.executable)"],
    {
      encoding: "utf-8",
      windowsHide: true,
    },
  );

  if (probeResult.status !== 0) {
    return candidate.resolvedCommand ?? null;
  }

  const output = `${probeResult.stdout ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!output) {
    return candidate.resolvedCommand ?? null;
  }

  const resolvedRuntimePath = path.resolve(output);

  if (fsSync.existsSync(resolvedRuntimePath) && !isPythonLauncherPath(resolvedRuntimePath)) {
    return resolvedRuntimePath;
  }

  if (candidate.command === "py" || isPythonLauncherPath(candidate.resolvedCommand ?? "")) {
    return (
      resolvePythonRuntimeFromLauncher(candidate) ??
      resolveWindowsPythonFromKnownLocations() ??
      null
    );
  }

  if (candidate.resolvedCommand && !isPythonLauncherPath(candidate.resolvedCommand)) {
    return candidate.resolvedCommand;
  }

  return resolveWindowsPythonFromKnownLocations();
}

function resolvePythonRunTarget(filePath) {
  if (typeof filePath !== "string") {
    throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ РїСѓС‚СЊ Рє С„Р°Р№Р»Сѓ Python РґР»СЏ Р·Р°РїСѓСЃРєР°.");
  }

  const trimmedPath = filePath.trim();

  if (!trimmedPath || trimmedPath === "." || trimmedPath === path.sep) {
    throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ РїСѓС‚СЊ Рє С„Р°Р№Р»Сѓ Python РґР»СЏ Р·Р°РїСѓСЃРєР°.");
  }

  const resolvedFilePath = path.resolve(trimmedPath);

  let fileStats = null;

  try {
    fileStats = fsSync.statSync(resolvedFilePath);
  } catch {
    throw new Error(`Р¤Р°Р№Р» РґР»СЏ Р·Р°РїСѓСЃРєР° РЅРµ РЅР°Р№РґРµРЅ: ${resolvedFilePath}`);
  }

  if (!fileStats.isFile()) {
    throw new Error(`РЈРєР°Р·Р°РЅРЅС‹Р№ РїСѓС‚СЊ РЅРµ СЏРІР»СЏРµС‚СЃСЏ С„Р°Р№Р»РѕРј: ${resolvedFilePath}`);
  }

  const fileDirectory = path.dirname(resolvedFilePath);

  let directoryStats = null;

  try {
    directoryStats = fsSync.statSync(fileDirectory);
  } catch {
    throw new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РґРёСЂРµРєС‚РѕСЂРёСЋ Р·Р°РїСѓСЃРєР°: ${fileDirectory}`);
  }

  if (!directoryStats.isDirectory()) {
    throw new Error(`РќРµРєРѕСЂСЂРµРєС‚РЅР°СЏ РґРёСЂРµРєС‚РѕСЂРёСЏ Р·Р°РїСѓСЃРєР°: ${fileDirectory}`);
  }

  return {
    resolvedFilePath,
    fileDirectory,
  };
}

function pickPythonShellCommand() {
  if (resolveExecutablePath("python")) {
    return "python";
  }

  if (process.platform === "win32" && resolveExecutablePath("py")) {
    return "py";
  }

  if (resolveExecutablePath("python3")) {
    return "python3";
  }

  return process.platform === "win32" ? "python" : "python3";
}

function formatPythonRunHeader() {
  return "";
}

function runPythonInTerminal(filePath) {
  if (!filePath) {
    throw new Error("РќРµ РІС‹Р±СЂР°РЅ С„Р°Р№Р» РґР»СЏ Р·Р°РїСѓСЃРєР°.");
  }

  if (!filePath.toLowerCase().endsWith(".py")) {
    throw new Error("РњРѕР¶РЅРѕ Р·Р°РїСѓСЃРєР°С‚СЊ С‚РѕР»СЊРєРѕ Python-С„Р°Р№Р»С‹ СЃ СЂР°СЃС€РёСЂРµРЅРёРµРј .py.");
  }

  if (activeIdeRunTerminalId) {
    throw new Error("РџСЂРµРґС‹РґСѓС‰РёР№ Р·Р°РїСѓСЃРє РµС‰Рµ РЅРµ Р·Р°РІРµСЂС€РµРЅ.");
  }

  const { resolvedFilePath, fileDirectory } = resolvePythonRunTarget(filePath);
  const interpreter = findAvailablePythonInterpreter();

  if (!interpreter) {
    const { terminal } = ensureShellTerminal();
    emitTerminalData(terminal.id, "\r\nPython РЅРµ РЅР°Р№РґРµРЅ. РЈСЃС‚Р°РЅРѕРІРёС‚Рµ Python РёР»Рё py launcher.\r\n");
    return {
      started: false,
      terminal,
      reason: "python-missing",
    };
  }

  const pythonRuntime = resolvePythonRuntime(interpreter);
  const pythonCommand = pythonRuntime ?? interpreter.resolvedCommand ?? null;

  if (!pythonCommand || !path.isAbsolute(pythonCommand) || !fsSync.existsSync(pythonCommand)) {
    throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ РїСѓС‚СЊ Рє Python РёРЅС‚РµСЂРїСЂРµС‚Р°С‚РѕСЂСѓ.");
  }

  const existingRunSession = ideRunTerminalId ? getTerminalSession(ideRunTerminalId) : null;

  if (existingRunSession?.isRunning) {
    throw new Error("Предыдущий запуск еще не завершен.");
  }

  const interpreterLabel = path.basename(pythonCommand);
  const terminalId = existingRunSession?.id ?? createTerminalId("run");
  const session = createPtySession({
    terminalId,
    mode: "python-run",
    title: "Python",
    command: pythonCommand,
    args: ["-u", resolvedFilePath],
    cwd: fileDirectory,
    label: interpreterLabel,
  });

  ideRunTerminalId = session.id;
  activeIdeRunTerminalId = session.id;
  session.isRunning = true;
  session.activeRun = {
    filePath: resolvedFilePath,
    interpreter: interpreterLabel,
  };

  emitTerminalData(session.id, formatPythonRunHeader(resolvedFilePath));

  emitTerminalStatus({
    type: "run-started",
    terminalId: session.id,
    filePath: resolvedFilePath,
    interpreter: interpreterLabel,
  });

  return {
    started: true,
    terminal: buildTerminalMeta(session),
  };
}

function runPythonInShellTerminal(filePath) {
  if (!filePath) {
    throw new Error("Не выбран файл для запуска.");
  }

  if (!filePath.toLowerCase().endsWith(".py")) {
    throw new Error("Для локального запуска нужен Python-файл с расширением .py.");
  }

  const { resolvedFilePath, fileDirectory } = resolvePythonRunTarget(filePath);
  const terminal = createShellSession();
  const session = requireTerminalSession(terminal.id);
  const commandText = buildPythonRunCommand({
    shellType: session.shellType,
    cwd: fileDirectory,
    filePath: resolvedFilePath,
    commandName: pickPythonShellCommand(),
  });

  session.pty?.write(`${commandText}\r`);

  return {
    started: true,
    terminal,
  };
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
      const stat = await fs.stat(targetPath);

      if (stat.isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true });
      } else {
        await fs.unlink(targetPath);
      }
    });

    return { success: true };
  });

  ipcMain.handle("terminal:create", async () => {
    return {
      terminal: createShellSession(),
    };
  });

  ipcMain.handle("terminal:ensure", async (_, terminalId) => {
    return ensureTerminalSession(terminalId ?? null);
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

  ipcMain.handle("terminal:run-python", async (_, filePath) => {
    return runPythonInShellTerminal(filePath);
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

  for (const terminalId of [...terminalOrder]) {
    disposeTerminalSession(terminalId, { notifyRenderer: false });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
