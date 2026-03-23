import { spawn, spawnSync } from "child_process";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { startFolderWatcher } from "./folderWatcher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUN_SENTINEL_PREFIX = "__CROSSPP_RUN_END__";

let mainWindow = null;
let currentWatcher = null;
let watchedRootPath = null;
let terminalSession = null;

function createWindow() {
  const rendererUrl =
    process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL;

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

  return process.platform === "win32"
    ? resolvedPath.toLowerCase()
    : resolvedPath;
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
        kind: "powershell",
        label: "PowerShell",
      };
    }

    return {
      command: "cmd.exe",
      args: [],
      kind: "cmd",
      label: "Command Prompt",
    };
  }

  const shellCommand = process.env.SHELL || "/bin/bash";

  return {
    command: shellCommand,
    args: [],
    kind: "posix",
    label: path.basename(shellCommand),
  };
}

function cleanupTerminalSession(notifyRenderer = true) {
  if (!terminalSession) {
    return;
  }

  const shellProcess = terminalSession.process;

  terminalSession = null;

  if (shellProcess && !shellProcess.killed) {
    shellProcess.removeAllListeners();
    shellProcess.stdout?.removeAllListeners();
    shellProcess.stderr?.removeAllListeners();
    shellProcess.kill();
  }

  if (notifyRenderer) {
    sendToRenderer("terminal:status", {
      type: "closed",
    });
  }
}

function emitTerminalData(text) {
  if (!text) {
    return;
  }

  sendToRenderer("terminal:data", {
    text,
  });
}

function emitTerminalStatus(payload) {
  sendToRenderer("terminal:status", payload);
}

function processTerminalChunk(text) {
  if (!terminalSession) {
    emitTerminalData(text);
    return;
  }

  const activeRun = terminalSession.activeRun;

  if (!activeRun) {
    emitTerminalData(text);
    return;
  }

  const marker = `${RUN_SENTINEL_PREFIX}:${activeRun.token}:`;
  const combined = `${terminalSession.pendingChunk}${text}`;
  const markerIndex = combined.indexOf(marker);

  if (markerIndex === -1) {
    const safeLength = Math.max(0, combined.length - marker.length);

    emitTerminalData(combined.slice(0, safeLength));
    terminalSession.pendingChunk = combined.slice(safeLength);
    return;
  }

  const afterMarker = combined.slice(markerIndex + marker.length);
  const match = afterMarker.match(/^(-?\d+)(\r?\n)?/);

  if (!match) {
    emitTerminalData(combined.slice(0, markerIndex));
    terminalSession.pendingChunk = combined.slice(markerIndex);
    return;
  }

  emitTerminalData(combined.slice(0, markerIndex));

  const exitCode = Number.parseInt(match[1], 10);
  const consumedLength = markerIndex + marker.length + match[0].length;
  const suffix = combined.slice(consumedLength);

  terminalSession.pendingChunk = "";
  terminalSession.activeRun = null;

  emitTerminalStatus({
    type: "run-finished",
    exitCode,
  });

  if (suffix) {
    emitTerminalData(suffix);
  }
}

async function ensureTerminalSession() {
  if (terminalSession && !terminalSession.process.killed) {
    return {
      shellLabel: terminalSession.label,
    };
  }

  const candidate = getShellCandidate();
  const shellProcess = spawn(candidate.command, candidate.args, {
    cwd: getInitialTerminalCwd(),
    windowsHide: true,
    stdio: "pipe",
  });

  shellProcess.stdout.setEncoding("utf-8");
  shellProcess.stderr.setEncoding("utf-8");

  terminalSession = {
    process: shellProcess,
    kind: candidate.kind,
    label: candidate.label,
    activeRun: null,
    pendingChunk: "",
  };

  shellProcess.stdout.on("data", (chunk) => {
    processTerminalChunk(chunk.toString());
  });

  shellProcess.stderr.on("data", (chunk) => {
    processTerminalChunk(chunk.toString());
  });

  shellProcess.on("error", (error) => {
    emitTerminalData(
      `\r\n[Terminal] Не удалось запустить shell: ${error.message}\r\n`,
    );
    cleanupTerminalSession();
  });

  shellProcess.on("close", () => {
    cleanupTerminalSession();
  });

  return {
    shellLabel: candidate.label,
  };
}

function escapePowerShellLiteral(value) {
  return value.replace(/'/g, "''");
}

function escapeCmdArgument(value) {
  return value.replace(/"/g, '""');
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
      return candidate;
    }
  }

  return null;
}

function buildRunCommand(shellKind, interpreter, filePath, token) {
  const fileDirectory = path.dirname(filePath);

  if (shellKind === "powershell") {
    const escapedDirectory = escapePowerShellLiteral(fileDirectory);
    const escapedCommand = escapePowerShellLiteral(interpreter.command);
    const escapedFilePath = escapePowerShellLiteral(filePath);
    const args = interpreter.args
      .map((argument) => `'${escapePowerShellLiteral(argument)}'`)
      .join(" ");

    return [
      `Set-Location -LiteralPath '${escapedDirectory}'`,
      `& '${escapedCommand}' ${args} '${escapedFilePath}'`,
      `$crossppCode = $LASTEXITCODE`,
      `Write-Output '${RUN_SENTINEL_PREFIX}:${token}:' + $crossppCode`,
    ].join("; ");
  }

  if (shellKind === "cmd") {
    const escapedDirectory = escapeCmdArgument(fileDirectory);
    const escapedFilePath = escapeCmdArgument(filePath);
    const args = interpreter.args
      .map((argument) => `"${escapeCmdArgument(argument)}"`)
      .join(" ");

    return [
      `cd /d "${escapedDirectory}"`,
      `"${interpreter.command}" ${args} "${escapedFilePath}"`,
      `echo ${RUN_SENTINEL_PREFIX}:${token}:%errorlevel%`,
    ].join("\r\n");
  }

  const escapedDirectory = fileDirectory.replace(/'/g, "'\\''");
  const escapedFilePath = filePath.replace(/'/g, "'\\''");
  const args = interpreter.args
    .map((argument) => `'${argument.replace(/'/g, "'\\''")}'`)
    .join(" ");

  return [
    `cd '${escapedDirectory}'`,
    `'${interpreter.command.replace(/'/g, "'\\''")}' ${args} '${escapedFilePath}'`,
    `echo ${RUN_SENTINEL_PREFIX}:${token}:$?`,
  ].join("\n");
}

async function runPythonInTerminal(filePath) {
  if (!filePath) {
    throw new Error("Не выбран файл для запуска.");
  }

  if (!filePath.toLowerCase().endsWith(".py")) {
    throw new Error("Можно запускать только Python-файлы с расширением .py.");
  }

  if (!fsSync.existsSync(filePath)) {
    throw new Error("Файл для запуска не найден.");
  }

  const session = await ensureTerminalSession();

  if (terminalSession.activeRun) {
    throw new Error("Предыдущий запуск еще не завершен.");
  }

  const interpreter = findAvailablePythonInterpreter();

  if (!interpreter) {
    emitTerminalData(
      "\r\nPython не найден. Установите Python или py launcher.\r\n",
    );
    return {
      started: false,
      reason: "python-missing",
    };
  }

  const token = Date.now().toString(36);
  const command = buildRunCommand(
    terminalSession.kind,
    interpreter,
    filePath,
    token,
  );

  terminalSession.activeRun = {
    token,
    filePath,
  };
  terminalSession.pendingChunk = "";

  emitTerminalStatus({
    type: "run-started",
    filePath,
    interpreter: interpreter.label,
  });

  terminalSession.process.stdin.write(`${command}\r\n`);

  return {
    started: true,
    shellLabel: session.shellLabel,
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
      throw new Error("Имя не может быть пустым.");
    }

    const fullPath = path.join(parentPath, trimmedName);

    if (fsSync.existsSync(fullPath)) {
      throw new Error("Такой объект уже существует.");
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
      throw new Error("Объект с таким именем уже существует.");
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

  ipcMain.handle("terminal:ensure", async () => {
    return ensureTerminalSession();
  });

  ipcMain.handle("terminal:write", async (_, data) => {
    const session = await ensureTerminalSession();

    terminalSession.process.stdin.write(data);

    return { success: true, shellLabel: session.shellLabel };
  });

  ipcMain.handle("terminal:resize", async () => {
    return { success: true };
  });

  ipcMain.handle("terminal:clear", async () => {
    const session = await ensureTerminalSession();
    const clearCommand =
      terminalSession.kind === "powershell"
        ? "Clear-Host\r\n"
        : terminalSession.kind === "cmd"
          ? "cls\r\n"
          : "clear\n";

    terminalSession.process.stdin.write(clearCommand);

    return { success: true, shellLabel: session.shellLabel };
  });

  ipcMain.handle("terminal:message", async (_, text) => {
    await ensureTerminalSession();
    emitTerminalData(`${text.endsWith("\n") ? text : `${text}\r\n`}`);

    return { success: true };
  });

  ipcMain.handle("terminal:run-python", async (_, filePath) => {
    return runPythonInTerminal(filePath);
  });
});

app.on("before-quit", async () => {
  await closeFolderWatcher();
  cleanupTerminalSession(false);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
