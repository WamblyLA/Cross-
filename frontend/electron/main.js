import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import fsSync from "fs";
import { startFolderWatcher } from "./folderWatcher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let currentWatcher = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

async function readFolder(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
  }));
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("folder:open", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const folderPath = result.filePaths[0];

    if (currentWatcher) {
      await currentWatcher.close();
    }

    currentWatcher = startFolderWatcher(folderPath, (payload) => {
      if (mainWindow) {
        mainWindow.webContents.send("folder:changed", payload);
      }
    });

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
    const fullPath = path.join(parentPath, name);

    if (fsSync.existsSync(fullPath)) {
      throw new Error("Такой объект уже существует");
    }

    if (isFolder) {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.writeFile(fullPath, "", "utf-8");
    }

    return { success: true };
  });

  ipcMain.handle("file:remove", async (_, targetPath) => {
    const stat = await fs.stat(targetPath);

    if (stat.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.unlink(targetPath);
    }

    return { success: true };
  });
});
