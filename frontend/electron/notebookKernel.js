import fsSync from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const PROTOCOL_PREFIX = "__CROSSPP_NOTEBOOK__";
const READY_TIMEOUT_MS = 15000;
const PROBE_TIMEOUT_MS = 5000;
const DISCOVERY_DEPTH_LIMIT = 3;
const ANSI_ESCAPE_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/g;
const KERNEL_PYTHON_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "notebookKernelPython.py",
);
const NOTEBOOK_DEBUG_ENABLED = process.env.CROSSPP_NOTEBOOK_DEBUG === "1";
let NOTEBOOK_DEBUG_BROKEN_PIPE = false;

function isBrokenPipeError(error) {
  if (!error) {
    return false;
  }

  if (error.code === "EPIPE") {
    return true;
  }

  return `${error.message ?? error}`.toLowerCase().includes("broken pipe");
}

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function writeLog(namespace, level, message, payload) {
  if (!NOTEBOOK_DEBUG_ENABLED || NOTEBOOK_DEBUG_BROKEN_PIPE) {
    return;
  }

  const prefix = `[${namespace}] ${message}`;
  const logger =
    typeof console[level] === "function" ? console[level] : console.log;

  try {
    if (payload === undefined) {
      logger(prefix);
      return;
    }

    logger(prefix, payload);
  } catch (error) {
    if (isBrokenPipeError(error)) {
      NOTEBOOK_DEBUG_BROKEN_PIPE = true;
      return;
    }

    throw error;
  }
}

function sanitizeProtocolLine(line) {
  return line
    .replace(/\u001b\].*?(?:\u0007|\u001b\\)/g, "")
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

function logDiscovery(level, message, payload) {
  writeLog("crosspp:notebook:discovery", level, message, payload);
}

function logKernel(level, message, payload) {
  writeLog("crosspp:notebook:kernel", level, message, payload);
}

function logExecution(level, message, payload) {
  writeLog("crosspp:notebook:execution", level, message, payload);
}

function buildDiagnostic(
  source,
  severity,
  message,
  details = null,
  extra = {},
) {
  return {
    source,
    severity,
    message,
    ...(details ? { details } : {}),
    ...extra,
  };
}

function normalizePathCase(filePath) {
  const resolvedPath = path.resolve(filePath);
  return process.platform === "win32"
    ? resolvedPath.toLowerCase()
    : resolvedPath;
}

function existsFile(filePath) {
  try {
    return fsSync.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function existsDirectory(filePath) {
  try {
    return fsSync.statSync(filePath).isDirectory();
  } catch {
    return false;
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

function extractPythonVersion(text) {
  if (!text) {
    return null;
  }

  const match = text.match(/Python\s+(\d+\.\d+(?:\.\d+)?)/i);
  return match?.[1] ?? null;
}

function extractLastNonEmptyLine(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}

function buildInterpreterProbeScript() {
  return [
    "import json, os, sys",
    "info = {",
    "  'executable': sys.executable,",
    "  'version': '.'.join(map(str, sys.version_info[:3])),",
    "  'prefix': sys.prefix,",
    "  'base_prefix': getattr(sys, 'base_prefix', sys.prefix),",
    "  'env_name': os.path.basename(sys.prefix) or os.path.basename(os.path.dirname(sys.executable)),",
    "  'conda_env': os.environ.get('CONDA_DEFAULT_ENV'),",
    "}",
    "print(json.dumps(info, ensure_ascii=False))",
  ].join("\n");
}

function buildLaunchFailureMessage(candidate, details) {
  if (isWindowsAppAliasPath(candidate.interpreterPath)) {
    return "Найден алиас Python, но не найден реальный интерпретатор.";
  }

  if (details?.includes?.("Access is denied")) {
    return "Интерпретатор найден, но доступ к его запуску запрещён.";
  }

  return "Интерпретатор найден, но не запускается.";
}

function getHomeDirectory() {
  return os.homedir?.() || process.env.USERPROFILE || process.env.HOME || "";
}

function resolveExecutablePath(command) {
  if (!command) {
    return null;
  }

  if (path.isAbsolute(command) && existsFile(command)) {
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

    if (existsFile(directCandidate)) {
      return directCandidate;
    }

    for (const extension of extensions) {
      const candidatePath = path.join(entry, `${command}${extension}`);

      if (existsFile(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

function quoteWindowsArg(value) {
  if (value === "") {
    return '""';
  }

  if (!/[ "\t"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`;
}

function runCommand(
  command,
  args = [],
  { timeoutMs = PROBE_TIMEOUT_MS, cwd, env } = {},
) {
  try {
    const isWindowsScript =
      process.platform === "win32" && /\.(cmd|bat)$/i.test(command);

    if (isWindowsScript) {
      const commandLine = [command, ...args]
        .map((part) => quoteWindowsArg(`${part}`))
        .join(" ");
      const result = spawnSync(
        process.env.comspec || "cmd.exe",
        ["/d", "/s", "/c", commandLine],
        {
          cwd,
          env,
          encoding: "utf-8",
          windowsHide: true,
          timeout: timeoutMs,
        },
      );

      return {
        status: result.status,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        error: result.error ?? null,
        timedOut: result.error?.code === "ETIMEDOUT",
      };
    }

    const result = spawnSync(command, args, {
      cwd,
      env,
      encoding: "utf-8",
      windowsHide: true,
      timeout: timeoutMs,
    });

    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error ?? null,
      timedOut: result.error?.code === "ETIMEDOUT",
    };
  } catch (error) {
    return {
      status: -1,
      stdout: "",
      stderr: "",
      error,
      timedOut: false,
    };
  }
}

function getVirtualEnvironmentInterpreter(envPath) {
  if (!envPath) {
    return null;
  }

  return process.platform === "win32"
    ? path.join(envPath, "Scripts", "python.exe")
    : path.join(envPath, "bin", "python");
}

function getToolManagedEnvDirectories(baseDirectory) {
  if (!baseDirectory || !existsDirectory(baseDirectory)) {
    return [];
  }

  try {
    return fsSync
      .readdirSync(baseDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(baseDirectory, entry.name));
  } catch {
    return [];
  }
}

function extractPythonExecutableFromText(text) {
  if (!text) {
    return [];
  }

  return text.match(/[A-Za-z]:\\[^\r\n]*?python(?:w)?\.exe/gi) ?? [];
}

function inferKindFromCandidate(candidate, info) {
  if (candidate.manager === "conda") {
    return "conda";
  }

  if (
    info?.prefix &&
    info?.base_prefix &&
    normalizePathCase(info.prefix) !== normalizePathCase(info.base_prefix)
  ) {
    return "venv";
  }

  return candidate.kind ?? "system";
}

function buildKernelDisplayName(candidate, version, interpreterPath) {
  const versionLabel = version ? `Python ${version}` : "Python";
  const fallbackName =
    candidate.envName ||
    path.basename(path.dirname(interpreterPath)) ||
    path.basename(interpreterPath);

  switch (candidate.manager) {
    case "workspace-venv":
      return `Проект: ${fallbackName} (${versionLabel})`;
    case "conda":
      return `${versionLabel} (conda: ${fallbackName})`;
    case "pyenv":
      return `${versionLabel} (pyenv: ${fallbackName})`;
    case "poetry":
      return `${versionLabel} (${fallbackName})`;
    case "pipenv":
      return `${versionLabel} (${fallbackName})`;
    default:
      return versionLabel;
  }
}

function pushCandidate(candidateMap, diagnostics, interpreterPath, metadata) {
  if (!interpreterPath) {
    return;
  }

  const resolvedInterpreterPath = path.resolve(interpreterPath);

  if (isWindowsAppAliasPath(resolvedInterpreterPath)) {
    const diagnostic = buildDiagnostic(
      metadata.source,
      "warn",
      "Кандидат отброшен: найден только алиас WindowsApps, а не реальный интерпретатор Python.",
      resolvedInterpreterPath,
      {
        interpreterPath: resolvedInterpreterPath,
        manager: metadata.manager,
      },
    );
    diagnostics.push(diagnostic);
    logDiscovery("warn", "Отброшен алиас WindowsApps.", {
      source: metadata.source,
      manager: metadata.manager,
      discoveredPath: resolvedInterpreterPath,
    });
    return;
  }

  if (!existsFile(resolvedInterpreterPath)) {
    diagnostics.push(
      buildDiagnostic(
        metadata.source,
        "warn",
        "Кандидат отброшен: интерпретатор не найден.",
        resolvedInterpreterPath,
        {
          interpreterPath: resolvedInterpreterPath,
          manager: metadata.manager,
        },
      ),
    );
    return;
  }

  const key = normalizePathCase(resolvedInterpreterPath);
  const existing = candidateMap.get(key);

  if (!existing || metadata.priority > existing.priority) {
    candidateMap.set(key, {
      discoveredPath: resolvedInterpreterPath,
      interpreterPath: resolvedInterpreterPath,
      diagnostics: [
        ...(existing?.diagnostics ?? []),
        ...(metadata.diagnostics ?? []),
      ],
      ...metadata,
    });
    return;
  }

  existing.diagnostics.push(...(metadata.diagnostics ?? []));
}

function buildNodePtyUnavailableError(nodePtyLoadError) {
  const baseMessage =
    "Для локального выполнения notebook нужен модуль node-pty. Запустите `npm run rebuild:native -w ./frontend`.";
  const details =
    nodePtyLoadError instanceof Error ? nodePtyLoadError.message : null;

  return new Error(
    details ? `${baseMessage} Подробности: ${details}` : baseMessage,
  );
}

function createSessionKey(notebookPath) {
  return normalizePathCase(path.resolve(notebookPath));
}

function createCommandId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function collectNearbyVirtualEnvPaths(notebookPath, workspacePath) {
  if (!notebookPath) {
    return [];
  }

  const results = [];
  const seenPaths = new Set();
  const workspaceRoot = workspacePath ? path.resolve(workspacePath) : null;
  let currentPath = path.dirname(path.resolve(notebookPath));

  while (currentPath && !seenPaths.has(currentPath)) {
    seenPaths.add(currentPath);

    for (const directoryName of [".venv", "venv", "env"]) {
      const candidatePath = path.join(currentPath, directoryName);

      if (existsDirectory(candidatePath)) {
        results.push(candidatePath);
      }
    }

    if (
      !workspaceRoot ||
      normalizePathCase(currentPath) === normalizePathCase(workspaceRoot)
    ) {
      break;
    }

    const parentPath = path.dirname(currentPath);

    if (parentPath === currentPath) {
      break;
    }

    currentPath = parentPath;
  }

  return results;
}

function collectWorkspaceVirtualEnvPaths(workspacePath) {
  if (!workspacePath || !existsDirectory(workspacePath)) {
    return [];
  }

  const discovered = [];
  const ignoredNames = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".turbo",
    "__pycache__",
  ]);
  const targetNames = new Set([".venv", "venv", "env"]);

  const walk = (currentPath, depth) => {
    if (depth > DISCOVERY_DEPTH_LIMIT) {
      return;
    }

    let entries = [];

    try {
      entries = fsSync.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath = path.join(currentPath, entry.name);
      const lowerName = entry.name.toLowerCase();

      if (targetNames.has(lowerName)) {
        discovered.push(fullPath);
        continue;
      }

      if (ignoredNames.has(lowerName)) {
        continue;
      }

      walk(fullPath, depth + 1);
    }
  };

  walk(path.resolve(workspacePath), 0);

  return discovered;
}

function locateWorkspaceVenvCandidates(context, candidateMap, diagnostics) {
  const nearbyEnvironments = collectNearbyVirtualEnvPaths(
    context.notebookPath,
    context.workspacePath,
  );
  const scannedEnvironments = collectWorkspaceVirtualEnvPaths(
    context.workspacePath,
  );

  for (const envPath of nearbyEnvironments) {
    pushCandidate(
      candidateMap,
      diagnostics,
      getVirtualEnvironmentInterpreter(envPath),
      {
        kind: "venv",
        source: "workspace-nearby",
        manager: "workspace-venv",
        locationKind: "workspace-local",
        envName: path.basename(envPath),
        isWorkspaceLocal: true,
        isRecommended: true,
        priority: 1000,
      },
    );
  }

  for (const envPath of scannedEnvironments) {
    pushCandidate(
      candidateMap,
      diagnostics,
      getVirtualEnvironmentInterpreter(envPath),
      {
        kind: "venv",
        source: "workspace-scan",
        manager: "workspace-venv",
        locationKind: "workspace-local",
        envName: path.basename(envPath),
        isWorkspaceLocal: true,
        priority: 920,
      },
    );
  }

  logDiscovery("info", "Завершён поиск локальных окружений проекта.", {
    nearby: nearbyEnvironments.length,
    scanned: scannedEnvironments.length,
  });
}

function getKnownCondaRoots() {
  const candidates = new Set();

  for (const candidate of [
    process.env.CONDA_PREFIX,
    process.env.MAMBA_ROOT_PREFIX,
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, "anaconda3")
      : null,
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, "miniconda3")
      : null,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "anaconda3")
      : null,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "miniconda3")
      : null,
    process.env.ProgramData
      ? path.join(process.env.ProgramData, "Anaconda3")
      : null,
    process.env.ProgramData
      ? path.join(process.env.ProgramData, "Miniconda3")
      : null,
  ]) {
    if (candidate && existsDirectory(candidate)) {
      candidates.add(path.resolve(candidate));
    }
  }

  return [...candidates];
}

function getCondaExecutableCandidates() {
  const results = new Set();

  for (const commandName of ["conda", "conda.exe", "conda.bat"]) {
    const resolvedPath = resolveExecutablePath(commandName);

    if (resolvedPath) {
      results.add(path.resolve(resolvedPath));
    }
  }

  for (const rootPath of getKnownCondaRoots()) {
    for (const relativePath of [
      "condabin\\conda.bat",
      "Scripts\\conda.exe",
      "Library\\bin\\conda.bat",
      "bin/conda",
    ]) {
      const candidatePath = path.join(rootPath, relativePath);

      if (existsFile(candidatePath)) {
        results.add(path.resolve(candidatePath));
      }
    }
  }

  return [...results];
}

function locateCondaCandidates(candidateMap, diagnostics) {
  const interpreterPaths = new Set();
  const condaExecutables = getCondaExecutableCandidates();

  for (const condaExecutable of condaExecutables) {
    const result = runCommand(condaExecutable, ["env", "list", "--json"], {
      timeoutMs: 7000,
    });

    if (result.error || result.status !== 0) {
      diagnostics.push(
        buildDiagnostic(
          "conda",
          "warn",
          "Не удалось получить список окружений conda.",
          result.error?.message || result.stderr || null,
          {
            manager: "conda",
          },
        ),
      );
      continue;
    }

    try {
      const parsed = JSON.parse(result.stdout || "{}");
      const envs = Array.isArray(parsed.envs) ? parsed.envs : [];

      for (const envPath of envs) {
        const interpreterPath = getVirtualEnvironmentInterpreter(envPath);

        if (interpreterPath) {
          interpreterPaths.add(interpreterPath);
        }
      }
    } catch (error) {
      diagnostics.push(
        buildDiagnostic(
          "conda",
          "warn",
          "Ответ conda не удалось разобрать.",
          error instanceof Error ? error.message : null,
          {
            manager: "conda",
          },
        ),
      );
    }
  }

  for (const rootPath of getKnownCondaRoots()) {
    const rootInterpreter =
      process.platform === "win32"
        ? path.join(rootPath, "python.exe")
        : path.join(rootPath, "bin", "python");

    if (existsFile(rootInterpreter)) {
      interpreterPaths.add(rootInterpreter);
    }

    const envsDirectory = path.join(rootPath, "envs");

    if (!existsDirectory(envsDirectory)) {
      continue;
    }

    for (const envPath of getToolManagedEnvDirectories(envsDirectory)) {
      const interpreterPath = getVirtualEnvironmentInterpreter(envPath);

      if (interpreterPath) {
        interpreterPaths.add(interpreterPath);
      }
    }
  }

  for (const interpreterPath of interpreterPaths) {
    pushCandidate(candidateMap, diagnostics, interpreterPath, {
      kind: "conda",
      source: "conda",
      manager: "conda",
      locationKind: "user-local",
      envName: path.basename(path.dirname(path.dirname(interpreterPath))),
      isWorkspaceLocal: false,
      priority: 860,
    });
  }

  logDiscovery("info", "Завершён поиск conda-окружений.", {
    executables: condaExecutables.length,
    interpreters: interpreterPaths.size,
  });
}

function getPyenvRoots() {
  const homeDirectory = getHomeDirectory();

  return [
    process.env.PYENV_ROOT,
    homeDirectory ? path.join(homeDirectory, ".pyenv") : null,
    homeDirectory ? path.join(homeDirectory, ".pyenv", "pyenv-win") : null,
  ].filter(Boolean);
}

function locatePyenvCandidates(candidateMap, diagnostics) {
  const roots = getPyenvRoots().filter((rootPath) => existsDirectory(rootPath));
  let foundInterpreters = 0;

  for (const rootPath of roots) {
    for (const versionsDirectory of [
      path.join(rootPath, "versions"),
      path.join(rootPath, "pyenv-win", "versions"),
    ]) {
      if (!existsDirectory(versionsDirectory)) {
        continue;
      }

      for (const versionPath of getToolManagedEnvDirectories(
        versionsDirectory,
      )) {
        const interpreterPath = getVirtualEnvironmentInterpreter(versionPath);

        if (!interpreterPath || !existsFile(interpreterPath)) {
          continue;
        }

        foundInterpreters += 1;
        pushCandidate(candidateMap, diagnostics, interpreterPath, {
          kind: "system",
          source: "pyenv",
          manager: "pyenv",
          locationKind: "user-local",
          envName: path.basename(versionPath),
          isWorkspaceLocal: false,
          priority: 780,
        });
      }
    }
  }

  logDiscovery("info", "Завершён поиск pyenv-окружений.", {
    roots: roots.length,
    interpreters: foundInterpreters,
  });
}

function getPoetryRoots() {
  const homeDirectory = getHomeDirectory();

  return [
    process.env.POETRY_VIRTUALENVS_PATH,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "pypoetry", "Cache", "virtualenvs")
      : null,
    process.env.APPDATA
      ? path.join(process.env.APPDATA, "pypoetry", "virtualenvs")
      : null,
    homeDirectory
      ? path.join(homeDirectory, ".cache", "pypoetry", "virtualenvs")
      : null,
  ].filter(Boolean);
}

function locatePoetryCandidates(context, candidateMap, diagnostics) {
  const roots = getPoetryRoots().filter((rootPath) =>
    existsDirectory(rootPath),
  );
  const discovered = new Set();
  const workspaceRoot = context.workspacePath
    ? normalizePathCase(path.resolve(context.workspacePath))
    : null;

  for (const rootPath of roots) {
    for (const envPath of getToolManagedEnvDirectories(rootPath)) {
      const interpreterPath = getVirtualEnvironmentInterpreter(envPath);

      if (interpreterPath && existsFile(interpreterPath)) {
        discovered.add(interpreterPath);
      }
    }
  }
  for (const basePath of [
    context.workspacePath,
    context.notebookPath ? path.dirname(context.notebookPath) : null,
  ]) {
    if (!basePath) {
      continue;
    }

    const localPoetryEnv = path.join(basePath, ".venv");
    const interpreterPath = getVirtualEnvironmentInterpreter(localPoetryEnv);

    if (interpreterPath && existsFile(interpreterPath)) {
      discovered.add(interpreterPath);
    }
  }

  for (const interpreterPath of discovered) {
    const envPath = path.dirname(path.dirname(interpreterPath));
    const isWorkspaceLocal =
      workspaceRoot && normalizePathCase(envPath).startsWith(workspaceRoot);

    pushCandidate(candidateMap, diagnostics, interpreterPath, {
      kind: "venv",
      source: "poetry",
      manager: "poetry",
      locationKind: isWorkspaceLocal ? "workspace-local" : "user-local",
      envName: path.basename(envPath),
      isWorkspaceLocal: Boolean(isWorkspaceLocal),
      priority: isWorkspaceLocal ? 980 : 820,
      isRecommended: Boolean(isWorkspaceLocal),
    });
  }

  logDiscovery("info", "Завершён поиск Poetry-окружений.", {
    roots: roots.length,
    interpreters: discovered.size,
  });
}

function locatePipenvCandidates(candidateMap, diagnostics) {
  const roots = [
    process.env.WORKON_HOME,
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, ".virtualenvs")
      : null,
  ].filter(Boolean);
  const discovered = new Set();

  for (const rootPath of roots) {
    if (!existsDirectory(rootPath)) {
      continue;
    }

    for (const envPath of getToolManagedEnvDirectories(rootPath)) {
      const interpreterPath = getVirtualEnvironmentInterpreter(envPath);

      if (interpreterPath && existsFile(interpreterPath)) {
        discovered.add(interpreterPath);
      }
    }
  }

  for (const interpreterPath of discovered) {
    const envPath = path.dirname(path.dirname(interpreterPath));
    pushCandidate(candidateMap, diagnostics, interpreterPath, {
      kind: "venv",
      source: "pipenv",
      manager: "pipenv",
      locationKind: "user-local",
      envName: path.basename(envPath),
      isWorkspaceLocal: false,
      priority: 800,
    });
  }

  logDiscovery("info", "Завершён поиск Pipenv-окружений.", {
    roots: roots.length,
    interpreters: discovered.size,
  });
}

function locateLauncherCandidates(candidateMap, diagnostics) {
  if (process.platform !== "win32") {
    return;
  }

  const result = runCommand("py", ["-0p"], { timeoutMs: 5000 });

  if (result.error || result.status !== 0) {
    diagnostics.push(
      buildDiagnostic(
        "launcher",
        "info",
        "Python launcher `py -0p` недоступен.",
        result.error?.message || result.stderr || null,
        {
          manager: "launcher",
        },
      ),
    );
    return;
  }

  const interpreterPaths = extractPythonExecutableFromText(
    `${result.stdout}\n${result.stderr}`,
  );

  for (const interpreterPath of interpreterPaths) {
    pushCandidate(candidateMap, diagnostics, interpreterPath, {
      kind: "system",
      source: "launcher",
      manager: "launcher",
      locationKind: "global-path",
      envName: path.basename(path.dirname(interpreterPath)),
      isWorkspaceLocal: false,
      priority: 760,
    });
  }

  logDiscovery("info", "Завершён поиск через Python launcher.", {
    interpreters: interpreterPaths.length,
  });
}

function locatePathCandidates(candidateMap, diagnostics) {
  const discovered = new Set();

  if (process.platform === "win32") {
    for (const commandName of ["python", "python3"]) {
      const result = runCommand("where.exe", [commandName], {
        timeoutMs: 4000,
      });

      if (result.error || result.status !== 0) {
        continue;
      }

      for (const line of result.stdout.split(/\r?\n/)) {
        const interpreterPath = line.trim();

        if (interpreterPath) {
          discovered.add(interpreterPath);
        }
      }
    }
  } else {
    for (const commandName of ["python", "python3"]) {
      const resolvedPath = resolveExecutablePath(commandName);

      if (resolvedPath) {
        discovered.add(resolvedPath);
      }
    }
  }

  for (const interpreterPath of discovered) {
    pushCandidate(candidateMap, diagnostics, interpreterPath, {
      kind: "system",
      source: "path",
      manager: "path",
      locationKind: "global-path",
      envName: path.basename(path.dirname(interpreterPath)),
      isWorkspaceLocal: false,
      priority: 720,
    });
  }

  logDiscovery("info", "Завершён поиск интерпретаторов в PATH.", {
    interpreters: discovered.size,
  });
}

function locateRegistryCandidates(candidateMap, diagnostics) {
  if (process.platform !== "win32") {
    return;
  }

  const registryRoots = [
    "HKCU\\Software\\Python\\PythonCore",
    "HKLM\\Software\\Python\\PythonCore",
    "HKLM\\Software\\WOW6432Node\\Python\\PythonCore",
  ];
  const discovered = new Set();

  for (const registryRoot of registryRoots) {
    const result = runCommand("reg.exe", ["query", registryRoot, "/s"], {
      timeoutMs: 6000,
    });

    if (result.error || result.status !== 0) {
      continue;
    }

    for (const executablePath of extractPythonExecutableFromText(
      result.stdout,
    )) {
      discovered.add(executablePath);
    }

    for (const match of result.stdout.matchAll(
      /InstallPath\s+REG_\w+\s+([^\r\n]+)/gi,
    )) {
      const installPath = match[1]?.trim();

      if (!installPath) {
        continue;
      }

      const interpreterPath = path.join(installPath, "python.exe");

      if (existsFile(interpreterPath)) {
        discovered.add(interpreterPath);
      }
    }
  }

  for (const interpreterPath of discovered) {
    pushCandidate(candidateMap, diagnostics, interpreterPath, {
      kind: "system",
      source: "registry",
      manager: "registry",
      locationKind: "system",
      envName: path.basename(path.dirname(interpreterPath)),
      isWorkspaceLocal: false,
      priority: 700,
    });
  }

  logDiscovery("info", "Завершён поиск интерпретаторов в реестре Windows.", {
    interpreters: discovered.size,
  });
}

function locateKnownInstallCandidates(candidateMap, diagnostics) {
  const discovered = new Set();
  const windowsLocations = [];

  if (process.platform === "win32") {
    if (process.env.LOCALAPPDATA) {
      windowsLocations.push(
        path.join(process.env.LOCALAPPDATA, "Programs", "Python"),
      );
    }

    if (process.env.ProgramFiles) {
      windowsLocations.push(process.env.ProgramFiles);
    }

    if (process.env["ProgramFiles(x86)"]) {
      windowsLocations.push(process.env["ProgramFiles(x86)"]);
    }

    for (const location of windowsLocations) {
      if (!existsDirectory(location)) {
        continue;
      }

      let entries = [];

      try {
        entries = fsSync.readdirSync(location, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory() || !/^python/i.test(entry.name)) {
          continue;
        }

        const interpreterPath = path.join(location, entry.name, "python.exe");

        if (existsFile(interpreterPath)) {
          discovered.add(interpreterPath);
        }
      }
    }
  }

  for (const interpreterPath of discovered) {
    pushCandidate(candidateMap, diagnostics, interpreterPath, {
      kind: "system",
      source: "known-install",
      manager: "known-install",
      locationKind: "system",
      envName: path.basename(path.dirname(interpreterPath)),
      isWorkspaceLocal: false,
      priority: 680,
    });
  }

  logDiscovery("info", "Завершён поиск известных системных установок Python.", {
    interpreters: discovered.size,
  });
}

function probeInterpreter(candidate, diagnostics) {
  const result = runCommand(
    candidate.interpreterPath,
    [
      "-c",
      [
        "import json, os, sys",
        "print(json.dumps({",
        "'executable': sys.executable,",
        "'version': '.'.join(map(str, sys.version_info[:3])),",
        "'prefix': sys.prefix,",
        "'base_prefix': getattr(sys, 'base_prefix', sys.prefix),",
        "'env_name': os.path.basename(sys.prefix) or os.path.basename(os.path.dirname(sys.executable)),",
        "'conda_env': os.environ.get('CONDA_DEFAULT_ENV'),",
        "}, ensure_ascii=False))",
      ].join("; "),
    ],
    { timeoutMs: PROBE_TIMEOUT_MS },
  );

  if (result.timedOut) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "error",
      "Интерпретатор не ответил на probe-команду вовремя.",
      candidate.interpreterPath,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );

    diagnostics.push(diagnostic);
    return {
      info: null,
      diagnostics: [diagnostic],
    };
  }

  if (result.error || result.status !== 0) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "error",
      "Не удалось получить сведения об интерпретаторе.",
      result.error?.message || result.stderr || candidate.interpreterPath,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );

    diagnostics.push(diagnostic);
    return {
      info: null,
      diagnostics: [diagnostic],
    };
  }

  const output = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!output) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "error",
      "Интерпретатор не вернул информацию о себе.",
      candidate.interpreterPath,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );

    diagnostics.push(diagnostic);
    return {
      info: null,
      diagnostics: [diagnostic],
    };
  }

  try {
    const info = JSON.parse(output);
    return {
      info,
      diagnostics: [],
    };
  } catch (error) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "error",
      "Ответ интерпретатора не удалось разобрать.",
      error instanceof Error ? error.message : output,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );

    diagnostics.push(diagnostic);
    return {
      info: null,
      diagnostics: [diagnostic],
    };
  }
}

function describeInterpreter(candidate, diagnostics) {
  const probeResult = probeInterpreter(candidate, diagnostics);
  const reportedExecutable =
    probeResult.info?.executable && existsFile(probeResult.info.executable)
      ? path.resolve(probeResult.info.executable)
      : candidate.interpreterPath;
  const envName =
    candidate.envName ||
    probeResult.info?.conda_env ||
    probeResult.info?.env_name ||
    path.basename(path.dirname(reportedExecutable));
  const kind = inferKindFromCandidate(candidate, probeResult.info);

  return {
    id: normalizePathCase(reportedExecutable),
    interpreterPath: reportedExecutable,
    displayName: buildKernelDisplayName(
      candidate,
      probeResult.info?.version ?? null,
      reportedExecutable,
    ),
    version: probeResult.info?.version ?? null,
    kind,
    source: candidate.source,
    manager: candidate.manager,
    locationKind: candidate.locationKind,
    envName,
    isRecommended: Boolean(candidate.isRecommended),
    isWorkspaceLocal: Boolean(candidate.isWorkspaceLocal),
    diagnostics: [...candidate.diagnostics, ...probeResult.diagnostics],
    priority: candidate.priority,
  };
}

function probeInterpreterDescriptor(candidate, diagnostics) {
  if (isWindowsAppAliasPath(candidate.interpreterPath)) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "error",
      "Найден алиас Python, но не найден реальный интерпретатор.",
      candidate.interpreterPath,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );
    diagnostics.push(diagnostic);
    return {
      info: null,
      diagnostics: [diagnostic],
      resolvedInterpreterPath: null,
      isLaunchable: false,
    };
  }

  const versionResult = runCommand(candidate.interpreterPath, ["--version"], {
    timeoutMs: PROBE_TIMEOUT_MS,
  });

  if (versionResult.timedOut) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "error",
      "Интерпретатор не ответил на команду проверки версии вовремя.",
      candidate.interpreterPath,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );
    diagnostics.push(diagnostic);
    return {
      info: null,
      diagnostics: [diagnostic],
      resolvedInterpreterPath: null,
      isLaunchable: false,
    };
  }

  if (versionResult.error || versionResult.status !== 0) {
    const details =
      versionResult.error?.message ||
      extractLastNonEmptyLine(versionResult.stderr) ||
      extractLastNonEmptyLine(versionResult.stdout) ||
      candidate.interpreterPath;
    const diagnostic = buildDiagnostic(
      candidate.source,
      "error",
      buildLaunchFailureMessage(candidate, details),
      details,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );
    diagnostics.push(diagnostic);
    return {
      info: null,
      diagnostics: [diagnostic],
      resolvedInterpreterPath: null,
      isLaunchable: false,
    };
  }

  const version =
    extractPythonVersion(`${versionResult.stdout}\n${versionResult.stderr}`) ??
    null;

  if (!version) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "error",
      "Не удалось определить версию Python.",
      extractLastNonEmptyLine(versionResult.stderr) ||
        extractLastNonEmptyLine(versionResult.stdout) ||
        candidate.interpreterPath,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );
    diagnostics.push(diagnostic);
    return {
      info: null,
      diagnostics: [diagnostic],
      resolvedInterpreterPath: null,
      isLaunchable: false,
    };
  }

  const detailsResult = runCommand(
    candidate.interpreterPath,
    ["-c", buildInterpreterProbeScript()],
    { timeoutMs: PROBE_TIMEOUT_MS },
  );

  const fallbackInfo = {
    executable: path.resolve(candidate.interpreterPath),
    version,
    prefix: null,
    base_prefix: null,
    env_name:
      candidate.envName ??
      path.basename(path.dirname(candidate.interpreterPath)),
    conda_env: null,
  };

  if (detailsResult.timedOut) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "warn",
      "Получение расширенных сведений о Python заняло слишком много времени. Используется базовая информация.",
      candidate.interpreterPath,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );
    diagnostics.push(diagnostic);
    return {
      info: fallbackInfo,
      diagnostics: [diagnostic],
      resolvedInterpreterPath: fallbackInfo.executable,
      isLaunchable: true,
    };
  }

  if (detailsResult.error || detailsResult.status !== 0) {
    const details =
      detailsResult.error?.message ||
      extractLastNonEmptyLine(detailsResult.stderr) ||
      extractLastNonEmptyLine(detailsResult.stdout) ||
      candidate.interpreterPath;
    const diagnostic = buildDiagnostic(
      candidate.source,
      "warn",
      "Не удалось получить расширенные сведения об интерпретаторе. Используется базовая информация.",
      details,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );
    diagnostics.push(diagnostic);
    return {
      info: fallbackInfo,
      diagnostics: [diagnostic],
      resolvedInterpreterPath: fallbackInfo.executable,
      isLaunchable: true,
    };
  }

  const output = extractLastNonEmptyLine(detailsResult.stdout);

  if (!output) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "warn",
      "Интерпретатор не вернул расширенные сведения о себе. Используется базовая информация.",
      candidate.interpreterPath,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );
    diagnostics.push(diagnostic);
    return {
      info: fallbackInfo,
      diagnostics: [diagnostic],
      resolvedInterpreterPath: fallbackInfo.executable,
      isLaunchable: true,
    };
  }

  try {
    const parsedInfo = JSON.parse(output);
    const reportedExecutable =
      typeof parsedInfo.executable === "string" &&
      existsFile(parsedInfo.executable)
        ? path.resolve(parsedInfo.executable)
        : fallbackInfo.executable;

    if (isWindowsAppAliasPath(reportedExecutable)) {
      const diagnostic = buildDiagnostic(
        candidate.source,
        "error",
        "Найден алиас Python, но не найден реальный интерпретатор.",
        reportedExecutable,
        {
          interpreterPath: candidate.interpreterPath,
          manager: candidate.manager,
        },
      );
      diagnostics.push(diagnostic);
      return {
        info: null,
        diagnostics: [diagnostic],
        resolvedInterpreterPath: null,
        isLaunchable: false,
      };
    }

    return {
      info: {
        ...parsedInfo,
        version:
          typeof parsedInfo.version === "string" && parsedInfo.version
            ? parsedInfo.version
            : version,
        executable: reportedExecutable,
      },
      diagnostics: [],
      resolvedInterpreterPath: reportedExecutable,
      isLaunchable: true,
    };
  } catch (error) {
    const diagnostic = buildDiagnostic(
      candidate.source,
      "warn",
      "Ответ интерпретатора не удалось разобрать. Используется базовая информация.",
      error instanceof Error ? error.message : output,
      {
        interpreterPath: candidate.interpreterPath,
        manager: candidate.manager,
      },
    );
    diagnostics.push(diagnostic);
    return {
      info: fallbackInfo,
      diagnostics: [diagnostic],
      resolvedInterpreterPath: fallbackInfo.executable,
      isLaunchable: true,
    };
  }
}

function buildVersionedKernelDisplayName(
  candidate,
  version,
  interpreterPath,
  envName,
) {
  const versionLabel = version ? `Python ${version}` : "Python";
  const fallbackName =
    envName ||
    candidate.envName ||
    path.basename(path.dirname(interpreterPath)) ||
    path.basename(interpreterPath);

  switch (candidate.manager) {
    case "workspace-venv":
    case "poetry":
    case "pipenv":
      return `${versionLabel} (${fallbackName})`;
    case "conda":
      return `${versionLabel} (conda: ${fallbackName})`;
    case "pyenv":
      return `${versionLabel} (pyenv: ${fallbackName})`;
    default:
      return versionLabel;
  }
}

function describeLaunchableInterpreter(candidate, diagnostics) {
  const probeResult = probeInterpreterDescriptor(candidate, diagnostics);
  const reportedExecutable =
    probeResult.resolvedInterpreterPath &&
    existsFile(probeResult.resolvedInterpreterPath)
      ? path.resolve(probeResult.resolvedInterpreterPath)
      : candidate.interpreterPath;
  const envName =
    candidate.envName ||
    probeResult.info?.conda_env ||
    probeResult.info?.env_name ||
    path.basename(path.dirname(reportedExecutable));
  const kind = inferKindFromCandidate(candidate, probeResult.info);

  return {
    id: normalizePathCase(reportedExecutable),
    interpreterPath: reportedExecutable,
    resolvedInterpreterPath: reportedExecutable,
    displayName: buildVersionedKernelDisplayName(
      candidate,
      probeResult.info?.version ?? null,
      reportedExecutable,
      envName,
    ),
    version: probeResult.info?.version ?? null,
    kind,
    source: candidate.source,
    manager: candidate.manager,
    locationKind: candidate.locationKind,
    envName,
    isRecommended: Boolean(candidate.isRecommended),
    isWorkspaceLocal: Boolean(candidate.isWorkspaceLocal),
    diagnostics: [...candidate.diagnostics, ...probeResult.diagnostics],
    isLaunchable: Boolean(probeResult.isLaunchable),
    priority: candidate.priority,
  };
}

function sortKernels(left, right) {
  const leftAvailability = left.diagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  )
    ? 1
    : 0;
  const rightAvailability = right.diagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  )
    ? 1
    : 0;

  if (leftAvailability !== rightAvailability) {
    return leftAvailability - rightAvailability;
  }

  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  if (left.isRecommended !== right.isRecommended) {
    return left.isRecommended ? -1 : 1;
  }

  if (left.isWorkspaceLocal !== right.isWorkspaceLocal) {
    return left.isWorkspaceLocal ? -1 : 1;
  }

  return left.displayName.localeCompare(right.displayName, "ru");
}

function buildDiscoveryCacheKey({
  workspacePath = null,
  notebookPath = null,
} = {}) {
  if (workspacePath) {
    return `workspace:${normalizePathCase(workspacePath)}`;
  }

  if (notebookPath) {
    return `notebook:${normalizePathCase(path.dirname(notebookPath))}`;
  }

  return "global:default";
}

function normalizeNotebookOutput(output) {
  if (!output || typeof output !== "object") {
    return null;
  }

  const outputType = output.output_type;

  if (outputType === "stream") {
    return {
      output_type: "stream",
      name: output.name === "stderr" ? "stderr" : "stdout",
      text: `${output.text ?? ""}`,
    };
  }

  if (outputType === "error") {
    return {
      output_type: "error",
      ename: `${output.ename ?? "Error"}`,
      evalue: `${output.evalue ?? ""}`,
      traceback: Array.isArray(output.traceback)
        ? output.traceback.map((line) => `${line ?? ""}`)
        : [],
    };
  }

  if (outputType === "display_data" || outputType === "execute_result") {
    return {
      output_type: outputType,
      data:
        output.data &&
        typeof output.data === "object" &&
        !Array.isArray(output.data)
          ? output.data
          : {},
      metadata:
        output.metadata &&
        typeof output.metadata === "object" &&
        !Array.isArray(output.metadata)
          ? output.metadata
          : {},
      execution_count:
        outputType === "execute_result" &&
        Number.isInteger(output.execution_count)
          ? output.execution_count
          : null,
    };
  }

  return null;
}

function appendNotebookOutput(outputs, nextOutput) {
  const normalizedOutput = normalizeNotebookOutput(nextOutput);

  if (!normalizedOutput) {
    return outputs;
  }

  const previousOutput = outputs.at(-1);

  if (
    previousOutput?.output_type === "stream" &&
    normalizedOutput.output_type === "stream" &&
    previousOutput.name === normalizedOutput.name
  ) {
    previousOutput.text += normalizedOutput.text;
    return outputs;
  }

  outputs.push(normalizedOutput);
  return outputs;
}

function createNotebookKernelManager({
  nodePty,
  nodePtyLoadError,
  sendToRenderer,
}) {
  const sessions = new Map();
  const discoveryCache = new Map();
  let refreshCounter = 0;

  const sendKernelEvent = (payload) => {
    sendToRenderer("notebook:kernel-event", payload);
  };

  const scanPythonKernels = (options = {}) => {
    const startedAt = Date.now();
    const diagnostics = [];
    const candidateMap = new Map();
    const context = {
      workspacePath: options.workspacePath
        ? path.resolve(options.workspacePath)
        : null,
      notebookPath: options.notebookPath
        ? path.resolve(options.notebookPath)
        : null,
    };

    locateWorkspaceVenvCandidates(context, candidateMap, diagnostics);
    locatePoetryCandidates(context, candidateMap, diagnostics);
    locatePipenvCandidates(candidateMap, diagnostics);
    locateCondaCandidates(candidateMap, diagnostics);
    locatePyenvCandidates(candidateMap, diagnostics);
    locateLauncherCandidates(candidateMap, diagnostics);
    locatePathCandidates(candidateMap, diagnostics);
    locateRegistryCandidates(candidateMap, diagnostics);
    locateKnownInstallCandidates(candidateMap, diagnostics);

    const descriptorMap = new Map();

    for (const candidate of candidateMap.values()) {
      const descriptor = describeLaunchableInterpreter(candidate, diagnostics);
      if (!descriptor.isLaunchable || !descriptor.version) {
        logDiscovery("warn", "Кандидат исключён из списка kernel.", {
          discoveredPath: candidate.discoveredPath ?? candidate.interpreterPath,
          resolvedInterpreterPath: descriptor.resolvedInterpreterPath ?? null,
          manager: candidate.manager,
          diagnostics: descriptor.diagnostics,
        });
        continue;
      }
      const descriptorKey = normalizePathCase(descriptor.interpreterPath);
      const existing = descriptorMap.get(descriptorKey);

      if (!existing || descriptor.priority > existing.priority) {
        descriptorMap.set(descriptorKey, descriptor);
      } else {
        existing.diagnostics.push(...descriptor.diagnostics);
      }
    }

    const kernels = [...descriptorMap.values()]
      .sort(sortKernels)
      .map((descriptor, index) => ({
        id: descriptor.id,
        interpreterPath: descriptor.interpreterPath,
        resolvedInterpreterPath: descriptor.resolvedInterpreterPath,
        displayName: descriptor.displayName,
        version: descriptor.version,
        kind: descriptor.kind,
        source: descriptor.source,
        manager: descriptor.manager,
        locationKind: descriptor.locationKind,
        envName: descriptor.envName,
        isRecommended: descriptor.isRecommended || index === 0,
        isWorkspaceLocal: descriptor.isWorkspaceLocal,
        diagnostics: descriptor.diagnostics,
        isLaunchable: descriptor.isLaunchable,
      }));

    const result = {
      kernels,
      refreshId: ++refreshCounter,
      diagnostics,
      durationMs: Date.now() - startedAt,
    };

    logDiscovery("info", "Полный поиск Python kernel завершён.", {
      workspacePath: context.workspacePath,
      notebookPath: context.notebookPath,
      kernels: kernels.length,
      diagnostics: diagnostics.length,
      durationMs: result.durationMs,
    });

    return result;
  };

  const refreshKernels = (options = {}) => {
    const cacheKey = buildDiscoveryCacheKey(options);
    const result = scanPythonKernels(options);
    discoveryCache.set(cacheKey, result);
    return result;
  };

  const listKernels = (options = {}) => {
    const cacheKey = buildDiscoveryCacheKey(options);
    return discoveryCache.get(cacheKey) ?? refreshKernels(options);
  };

  const getKernelDiagnostics = (options = {}) => {
    const cacheKey = buildDiscoveryCacheKey(options);
    return (discoveryCache.get(cacheKey) ?? refreshKernels(options))
      .diagnostics;
  };

  const cleanupPendingExecution = (session, status, message) => {
    if (!session.pendingExecution) {
      return;
    }

    const errorOutput = normalizeNotebookOutput({
      output_type: "error",
      ename:
        status === "interrupted" ? "KernelInterrupted" : "KernelTerminated",
      evalue: message,
      traceback: [],
    });

    if (errorOutput) {
      appendNotebookOutput(session.pendingExecution.outputs, errorOutput);
      sendKernelEvent({
        type: "output",
        notebookPath: session.notebookPath,
        cellId: session.pendingExecution.cellId,
        output: errorOutput,
      });
    }

    const result = {
      status,
      executionCount: session.pendingExecution.executionCount,
      outputs: [...session.pendingExecution.outputs],
      interpreterPath: session.interpreterPath,
    };

    sendKernelEvent({
      type: "execution-finished",
      notebookPath: session.notebookPath,
      cellId: session.pendingExecution.cellId,
      status,
      executionCount: session.pendingExecution.executionCount,
      outputs: result.outputs,
    });

    logExecution("warn", "Выполнение прервано аварийным завершением kernel.", {
      notebookPath: session.notebookPath,
      cellId: session.pendingExecution.cellId,
      status,
      message,
    });

    session.pendingExecution.resolve(result);
    session.pendingExecution = null;
    session.status = "idle";
  };

  const disposeSession = (
    session,
    { emitExit = false, reason = "Kernel остановлен." } = {},
  ) => {
    if (!session || session.disposed) {
      return;
    }

    session.disposed = true;
    session.status = "disposed";

    if (session.readyTimeout) {
      clearTimeout(session.readyTimeout);
      session.readyTimeout = null;
    }

    if (session.pendingExecution) {
      cleanupPendingExecution(session, "interrupted", reason);
    }

    if (!session.readyResolved) {
      session.readyResolved = true;
      session.readyDeferred.reject(new Error(reason));
    }

    try {
      session.pty?.kill();
    } catch {}

    sessions.delete(session.key);
    logKernel("info", "Kernel session освобождена.", {
      notebookPath: session.notebookPath,
      interpreterPath: session.interpreterPath,
      reason,
    });

    if (emitExit) {
      sendKernelEvent({
        type: "kernel-exited",
        notebookPath: session.notebookPath,
        interpreterPath: session.interpreterPath,
        startupMs: Date.now() - session.startedAt,
        firstProtocolMs: session.firstProtocolAt - session.startedAt,
        reason,
      });
    }
  };

  const handleProtocolMessage = (session, message) => {
    const eventType = message?.event;

    if (eventType === "ready") {
      if (!session.firstProtocolAt) {
        session.firstProtocolAt = Date.now();
      }

      session.readyResolved = true;

      if (session.readyTimeout) {
        clearTimeout(session.readyTimeout);
        session.readyTimeout = null;
      }

      if (typeof message.python_version === "string") {
        session.kernel.version = message.python_version;
      }

      logKernel("info", "Kernel готов к выполнению.", {
        notebookPath: session.notebookPath,
        interpreterPath: session.interpreterPath,
      });

      session.readyDeferred.resolve(session.kernel);
      sendKernelEvent({
        type: "kernel-ready",
        notebookPath: session.notebookPath,
        interpreterPath: session.interpreterPath,
        displayName: session.kernel.displayName,
        version: session.kernel.version,
      });
      return;
    }

    if (eventType === "protocol_error") {
      logKernel("error", "Kernel вернул protocol error.", {
        notebookPath: session.notebookPath,
        interpreterPath: session.interpreterPath,
        message: message?.message ?? null,
      });
      return;
    }

    if (eventType === "execution_started") {
      session.status = "running";

      if (
        session.pendingExecution &&
        session.pendingExecution.commandId === message.id
      ) {
        session.pendingExecution.executionCount = Number.isInteger(
          message.execution_count,
        )
          ? message.execution_count
          : null;

        logExecution("info", "Стартовало выполнение ячейки.", {
          notebookPath: session.notebookPath,
          cellId: session.pendingExecution.cellId,
          executionCount: session.pendingExecution.executionCount,
        });

        sendKernelEvent({
          type: "execution-started",
          notebookPath: session.notebookPath,
          cellId: session.pendingExecution.cellId,
          executionCount: session.pendingExecution.executionCount,
        });
      }
      return;
    }

    if (eventType === "output") {
      if (
        session.pendingExecution &&
        session.pendingExecution.commandId === message.id
      ) {
        const normalizedOutput = normalizeNotebookOutput(message.output);

        if (normalizedOutput) {
          appendNotebookOutput(
            session.pendingExecution.outputs,
            normalizedOutput,
          );
          sendKernelEvent({
            type: "output",
            notebookPath: session.notebookPath,
            cellId: session.pendingExecution.cellId,
            output: normalizedOutput,
          });
        }
      }
      return;
    }

    if (eventType === "execution_finished") {
      session.status = "idle";

      if (
        session.pendingExecution &&
        session.pendingExecution.commandId === message.id
      ) {
        const status =
          message.status === "error"
            ? "error"
            : message.status === "interrupted"
              ? "interrupted"
              : "ok";

        session.pendingExecution.executionCount = Number.isInteger(
          message.execution_count,
        )
          ? message.execution_count
          : session.pendingExecution.executionCount;

        const result = {
          status,
          executionCount: session.pendingExecution.executionCount,
          outputs: [...session.pendingExecution.outputs],
          interpreterPath: session.interpreterPath,
        };

        logExecution(
          status === "ok" ? "info" : "error",
          "Завершилось выполнение ячейки.",
          {
            notebookPath: session.notebookPath,
            cellId: session.pendingExecution.cellId,
            status,
            executionCount: result.executionCount,
          },
        );

        sendKernelEvent({
          type: "execution-finished",
          notebookPath: session.notebookPath,
          cellId: session.pendingExecution.cellId,
          status,
          executionCount: result.executionCount,
          outputs: result.outputs,
        });

        session.pendingExecution.resolve(result);
        session.pendingExecution = null;
      }
      return;
    }

    if (eventType === "shutdown") {
      session.status = "idle";
    }
  };

  const attachSessionListeners = (session) => {
    session.pty.onData((chunk) => {
      if (session.disposed) {
        return;
      }

      session.buffer += chunk;
      const parts = session.buffer.split(/\r?\n/);
      session.buffer = parts.pop() ?? "";

      for (const part of parts) {
        const rawLine = part.trim();
        const sanitizedLine = sanitizeProtocolLine(rawLine);

        if (!sanitizedLine) {
          continue;
        }

        const protocolOffset = sanitizedLine.indexOf(PROTOCOL_PREFIX);

        if (
          protocolOffset === -1 &&
          (sanitizedLine.startsWith('{"type":"execute"') ||
            sanitizedLine.startsWith('{"type":"shutdown"'))
        ) {
          continue;
        }

        if (protocolOffset === -1) {
          session.lastNonProtocolLine = sanitizedLine;
          logKernel("warn", "Kernel прислал непротокольную строку.", {
            notebookPath: session.notebookPath,
            rawLine,
            sanitizedLine,
          });
          continue;
        }

        try {
          if (!session.firstProtocolAt) {
            session.firstProtocolAt = Date.now();
          }

          const protocolPayload = sanitizedLine.slice(
            protocolOffset + PROTOCOL_PREFIX.length,
          );
          const message = JSON.parse(protocolPayload);
          handleProtocolMessage(session, message);
        } catch (error) {
          logKernel("error", "Не удалось разобрать строку протокола kernel.", {
            notebookPath: session.notebookPath,
            rawLine,
            sanitizedLine,
            protocolOffset,
            error: error instanceof Error ? error.message : error,
          });
        }
      }
    });

    session.pty.onExit(({ exitCode }) => {
      if (session.disposed) {
        sessions.delete(session.key);
        return;
      }

      const reason =
        exitCode === 0
          ? "Python kernel завершился."
          : `Python kernel завершился с кодом ${exitCode ?? "unknown"}.`;

      disposeSession(session, {
        emitExit: true,
        reason,
      });
    });
  };

  const spawnKernelSession = (notebookPath, kernelDescriptor) => {
    if (!nodePty) {
      throw buildNodePtyUnavailableError(nodePtyLoadError);
    }

    const notebookDirectory = existsDirectory(path.dirname(notebookPath))
      ? path.dirname(notebookPath)
      : process.cwd();
    const key = createSessionKey(notebookPath);
    const readyDeferred = createDeferred();
    const runtimeInterpreterPath =
      kernelDescriptor.resolvedInterpreterPath ||
      kernelDescriptor.interpreterPath;
    const session = {
      key,
      notebookPath: path.resolve(notebookPath),
      interpreterPath: runtimeInterpreterPath,
      kernel: { ...kernelDescriptor },
      startedAt: Date.now(),
      firstProtocolAt: null,
      lastNonProtocolLine: null,
      pty: nodePty.spawn(runtimeInterpreterPath, [KERNEL_PYTHON_PATH], {
        cwd: notebookDirectory,
        cols: 120,
        rows: 30,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          PYTHONIOENCODING: "utf-8",
          TERM: "dumb",
        },
        useConpty: process.platform === "win32",
      }),
      buffer: "",
      status: "starting",
      pendingExecution: null,
      readyDeferred,
      readyResolved: false,
      readyTimeout: null,
      disposed: false,
    };

    session.readyTimeout = setTimeout(() => {
      if (session.readyResolved) {
        return;
      }

      const startupDurationMs = Date.now() - session.startedAt;
      logKernel("error", "Python kernel не прислал сигнал ready.", {
        notebookPath: session.notebookPath,
        interpreterPath: session.interpreterPath,
        cwd: notebookDirectory,
        durationMs: startupDurationMs,
        lastOutputLine: session.lastNonProtocolLine,
      });
      session.readyResolved = true;
      readyDeferred.reject(
        new Error(
          "Python kernel не прислал сигнал готовности. Подробности смотрите в консоли.",
        ),
      );
      disposeSession(session, {
        emitExit: true,
        reason: "Python kernel не прислал сигнал готовности.",
      });
    }, READY_TIMEOUT_MS);

    attachSessionListeners(session);
    sessions.set(key, session);
    logKernel("info", "Запущен новый Python kernel.", {
      notebookPath: session.notebookPath,
      interpreterPath: session.interpreterPath,
    });
    return session;
  };

  const getDescriptorFromCache = (interpreterPath, options) => {
    const discoveryResult = listKernels(options);
    const normalizedInterpreterPath = normalizePathCase(interpreterPath);

    return (
      discoveryResult.kernels.find(
        (kernel) =>
          normalizePathCase(kernel.interpreterPath) ===
            normalizedInterpreterPath ||
          normalizePathCase(kernel.resolvedInterpreterPath) ===
            normalizedInterpreterPath,
      ) ?? null
    );
  };

  const ensureKernelSession = async (notebookPath, interpreterPath) => {
    if (!notebookPath) {
      throw new Error("Не передан путь к notebook-файлу.");
    }

    if (!interpreterPath) {
      throw new Error("Сначала выберите Python kernel.");
    }

    const key = createSessionKey(notebookPath);
    const existingSession = sessions.get(key) ?? null;
    const normalizedInterpreterPath = normalizePathCase(interpreterPath);

    if (
      existingSession &&
      normalizePathCase(existingSession.interpreterPath) ===
        normalizedInterpreterPath &&
      !existingSession.disposed
    ) {
      await existingSession.readyDeferred.promise;
      return existingSession;
    }

    if (existingSession) {
      disposeSession(existingSession, {
        emitExit: false,
        reason: "Kernel был перезапущен для другого интерпретатора.",
      });
    }

    const kernelDescriptor =
      getDescriptorFromCache(interpreterPath, {
        notebookPath,
        workspacePath: path.dirname(notebookPath),
      }) ||
      describeLaunchableInterpreter(
        {
          interpreterPath: path.resolve(interpreterPath),
          discoveredPath: path.resolve(interpreterPath),
          kind: "system",
          source: "selected",
          manager: "selected",
          locationKind: "global-path",
          envName: path.basename(path.dirname(interpreterPath)),
          isWorkspaceLocal: false,
          isRecommended: false,
          priority: 0,
          diagnostics: [],
        },
        [],
      );

    const hasCriticalDiagnostic = kernelDescriptor.diagnostics.some(
      (diagnostic) => diagnostic.severity === "error",
    );

    if (!kernelDescriptor.isLaunchable || hasCriticalDiagnostic) {
      const message = kernelDescriptor.diagnostics.find(
        (diagnostic) => diagnostic.severity === "error",
      )?.message;
      throw new Error(
        message || "Выбранный Python kernel недоступен для запуска.",
      );
    }

    const session = spawnKernelSession(notebookPath, kernelDescriptor);
    await session.readyDeferred.promise;
    return session;
  };

  return {
    listKernels(options) {
      return listKernels(options);
    },
    refreshKernels(options) {
      return refreshKernels(options);
    },
    getKernelDiagnostics(options) {
      return getKernelDiagnostics(options);
    },
    async executeCell({ notebookPath, interpreterPath, cellId, source }) {
      const session = await ensureKernelSession(notebookPath, interpreterPath);

      if (session.pendingExecution) {
        throw new Error("Python kernel уже выполняет другую ячейку.");
      }

      const commandId = createCommandId("exec");
      const executionDeferred = createDeferred();

      session.pendingExecution = {
        commandId,
        cellId,
        outputs: [],
        executionCount: null,
        resolve: executionDeferred.resolve,
        reject: executionDeferred.reject,
      };

      logExecution("info", "Отправлена команда на выполнение ячейки.", {
        notebookPath,
        interpreterPath,
        cellId,
      });

      session.pty.write(
        `${JSON.stringify({
          type: "execute",
          id: commandId,
          cell_id: cellId,
          source: source ?? "",
        })}\r`,
      );

      return executionDeferred.promise;
    },
    async interruptKernel(notebookPath) {
      const session = sessions.get(createSessionKey(notebookPath)) ?? null;

      if (!session || session.disposed || session.status !== "running") {
        return { success: true };
      }

      logKernel("warn", "Отправлен soft interrupt активному kernel.", {
        notebookPath,
        interpreterPath: session.interpreterPath,
      });
      session.pty.write("\u0003");
      return { success: true };
    },
    async restartKernel({ notebookPath, interpreterPath }) {
      const key = createSessionKey(notebookPath);
      const session = sessions.get(key) ?? null;

      if (session) {
        disposeSession(session, {
          emitExit: false,
          reason: "Kernel был перезапущен пользователем.",
        });
      }

      if (!interpreterPath) {
        return {
          success: true,
          kernel: null,
        };
      }

      const nextSession = await ensureKernelSession(
        notebookPath,
        interpreterPath,
      );

      sendKernelEvent({
        type: "kernel-restarted",
        notebookPath: nextSession.notebookPath,
        interpreterPath: nextSession.interpreterPath,
      });

      return {
        success: true,
        kernel: nextSession.kernel,
      };
    },
    async releaseKernel(notebookPath) {
      const session = sessions.get(createSessionKey(notebookPath)) ?? null;

      if (session) {
        disposeSession(session, {
          emitExit: false,
          reason: "Kernel освобождён после закрытия notebook.",
        });
      }

      return {
        success: true,
      };
    },
    disposeAll() {
      for (const session of [...sessions.values()]) {
        disposeSession(session, {
          emitExit: false,
          reason: "Менеджер notebook kernel завершает работу.",
        });
      }
    },
  };
}

export { createNotebookKernelManager };
