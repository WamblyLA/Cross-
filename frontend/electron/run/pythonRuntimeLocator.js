import fsSync from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  existsDirectory,
  existsFile,
  normalizePathCase,
  resolveExecutablePath,
} from "./utils.js";

const PYTHON_ENV_NAMES = [".venv", "venv", "env"];
const WORKSPACE_SCAN_DEPTH = 2;

function createInterpreterDescriptor(interpreterPath, metadata) {
  const resolvedPath = path.resolve(interpreterPath);

  return {
    id: `python:${normalizePathCase(resolvedPath)}`,
    path: resolvedPath,
    label: metadata.label,
    kind: metadata.kind,
    isRecommended: Boolean(metadata.isRecommended),
  };
}

function addInterpreterCandidate(candidateMap, interpreterPath, metadata) {
  if (!interpreterPath || !existsFile(interpreterPath)) {
    return;
  }

  const descriptor = createInterpreterDescriptor(interpreterPath, metadata);
  const key = normalizePathCase(descriptor.path);
  const existingDescriptor = candidateMap.get(key);

  if (!existingDescriptor || descriptor.isRecommended) {
    candidateMap.set(key, descriptor);
  }
}

function getVirtualEnvironmentInterpreter(environmentPath) {
  return process.platform === "win32"
    ? path.join(environmentPath, "Scripts", "python.exe")
    : path.join(environmentPath, "bin", "python");
}

function scanWorkspaceVirtualEnvironments(workspaceRootPath) {
  if (!workspaceRootPath || !existsDirectory(workspaceRootPath)) {
    return [];
  }

  const discovered = [];
  const ignoredDirectories = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
  ]);

  const visitDirectory = (directoryPath, depth) => {
    if (depth > WORKSPACE_SCAN_DEPTH) {
      return;
    }

    let entries = [];

    try {
      entries = fsSync.readdirSync(directoryPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryName = entry.name.toLowerCase();
      const fullPath = path.join(directoryPath, entry.name);

      if (PYTHON_ENV_NAMES.includes(entryName)) {
        discovered.push(fullPath);
        continue;
      }

      if (ignoredDirectories.has(entryName)) {
        continue;
      }

      visitDirectory(fullPath, depth + 1);
    }
  };

  visitDirectory(path.resolve(workspaceRootPath), 0);

  return discovered;
}

function listWorkspaceInterpreters(candidateMap, workspaceRootPath) {
  for (const environmentPath of scanWorkspaceVirtualEnvironments(workspaceRootPath)) {
    const interpreterPath = getVirtualEnvironmentInterpreter(environmentPath);
    const environmentName = path.basename(environmentPath);

    addInterpreterCandidate(candidateMap, interpreterPath, {
      label: `Проект: ${environmentName}`,
      kind: "workspace",
      isRecommended: true,
    });
  }
}

function isWindowsAppAliasPath(filePath) {
  if (process.platform !== "win32" || !filePath) {
    return false;
  }

  return normalizePathCase(filePath).includes(
    `${path.sep}microsoft${path.sep}windowsapps${path.sep}`,
  );
}

function extractPythonExecutableFromText(text) {
  if (!text) {
    return [];
  }

  return text.match(/[A-Za-z]:\\[^\r\n]*?python(?:w)?\.exe/gi) ?? [];
}

function listLauncherInterpreters(candidateMap) {
  if (process.platform !== "win32") {
    return;
  }

  const result = spawnSync("py", ["-0p"], {
    encoding: "utf-8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    return;
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  for (const interpreterPath of extractPythonExecutableFromText(output)) {
    if (isWindowsAppAliasPath(interpreterPath)) {
      continue;
    }

    addInterpreterCandidate(candidateMap, interpreterPath, {
      label: `Python Launcher: ${path.basename(path.dirname(interpreterPath))}`,
      kind: "launcher",
    });
  }
}

function probeExecutableFromCommand(commandName) {
  const result = spawnSync(
    commandName,
    ["-c", "import sys; print(getattr(sys, '_base_executable', '') or sys.executable)"],
    {
      encoding: "utf-8",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    return null;
  }

  const output = `${result.stdout ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!output || isWindowsAppAliasPath(output)) {
    return null;
  }

  return existsFile(output) ? path.resolve(output) : null;
}

function listPathInterpreters(candidateMap) {
  for (const commandName of ["python", "python3"]) {
    const resolvedRuntimePath = probeExecutableFromCommand(commandName);

    if (resolvedRuntimePath) {
      addInterpreterCandidate(candidateMap, resolvedRuntimePath, {
        label: `PATH: ${commandName}`,
        kind: "path",
      });
      continue;
    }

    const resolvedCommandPath = resolveExecutablePath(commandName);

    if (resolvedCommandPath && !isWindowsAppAliasPath(resolvedCommandPath)) {
      addInterpreterCandidate(candidateMap, resolvedCommandPath, {
        label: `PATH: ${commandName}`,
        kind: "path",
      });
    }
  }
}

function listKnownWindowsInterpreters(candidateMap) {
  if (process.platform !== "win32") {
    return;
  }

  const baseDirectory = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Programs", "Python")
    : null;

  if (!baseDirectory || !existsDirectory(baseDirectory)) {
    return;
  }

  let entries = [];

  try {
    entries = fsSync.readdirSync(baseDirectory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^python/i.test(entry.name)) {
      continue;
    }

    const interpreterPath = path.join(baseDirectory, entry.name, "python.exe");

    addInterpreterCandidate(candidateMap, interpreterPath, {
      label: `Система: ${entry.name}`,
      kind: "known-install",
    });
  }
}

export function listPythonInterpreters({ workspaceRootPath } = {}) {
  const candidateMap = new Map();

  listWorkspaceInterpreters(candidateMap, workspaceRootPath);
  listLauncherInterpreters(candidateMap);
  listPathInterpreters(candidateMap);
  listKnownWindowsInterpreters(candidateMap);

  return [...candidateMap.values()].sort((left, right) => {
    if (left.isRecommended !== right.isRecommended) {
      return left.isRecommended ? -1 : 1;
    }

    return left.label.localeCompare(right.label, "ru");
  });
}

export function resolvePythonInterpreter({ interpreterPath, workspaceRootPath } = {}) {
  const normalizedInterpreterPath = `${interpreterPath ?? ""}`.trim();

  if (normalizedInterpreterPath && normalizedInterpreterPath !== "auto") {
    const resolvedPath = path.resolve(normalizedInterpreterPath);

    if (!existsFile(resolvedPath)) {
      throw new Error(`Python интерпретатор не найден: ${resolvedPath}`);
    }

    return createInterpreterDescriptor(resolvedPath, {
      label: path.basename(resolvedPath),
      kind: "custom",
      isRecommended: false,
    });
  }

  const interpreters = listPythonInterpreters({ workspaceRootPath });

  if (interpreters.length === 0) {
    throw new Error("Не удалось найти Python интерпретатор на этом компьютере.");
  }

  return interpreters[0];
}
