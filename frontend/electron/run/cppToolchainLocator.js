import fsSync from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { existsFile, normalizePathCase, resolveExecutablePath } from "./utils.js";

function createToolchainDescriptor(metadata) {
  const resolvedPath =
    metadata.path && path.isAbsolute(metadata.path) ? path.resolve(metadata.path) : metadata.path;
  const descriptorKey = metadata.setupScriptPath
    ? `${metadata.kind}:${normalizePathCase(metadata.setupScriptPath)}`
    : `${metadata.kind}:${normalizePathCase(resolvedPath ?? metadata.kind)}`;

  return {
    id: `cpp:${descriptorKey}`,
    kind: metadata.kind,
    label: metadata.label,
    path: resolvedPath,
    setupScriptPath: metadata.setupScriptPath ?? null,
    isRecommended: Boolean(metadata.isRecommended),
  };
}

function addToolchainCandidate(candidateMap, metadata) {
  if (metadata.path && path.isAbsolute(metadata.path) && !existsFile(metadata.path)) {
    return;
  }

  const descriptor = createToolchainDescriptor(metadata);
  const existingDescriptor = candidateMap.get(descriptor.id);

  if (!existingDescriptor || descriptor.isRecommended) {
    candidateMap.set(descriptor.id, descriptor);
  }
}

function listPathCompilers(candidateMap) {
  const compilerCommands = [
    {
      command: "g++",
      kind: "gcc",
      label: "G++",
      isRecommended: true,
    },
    {
      command: "clang++",
      kind: "clang",
      label: "Clang++",
      isRecommended: false,
    },
    {
      command: "cl.exe",
      kind: "msvc",
      label: "MSVC (PATH)",
      isRecommended: false,
    },
  ];

  for (const compiler of compilerCommands) {
    const resolvedPath = resolveExecutablePath(compiler.command);

    if (!resolvedPath) {
      continue;
    }

    addToolchainCandidate(candidateMap, {
      kind: compiler.kind,
      label: compiler.label,
      path: resolvedPath,
      isRecommended: compiler.isRecommended,
    });
  }
}

function resolveVsWherePath() {
  if (process.platform !== "win32") {
    return null;
  }

  const candidatePath = process.env["ProgramFiles(x86)"]
    ? path.join(
        process.env["ProgramFiles(x86)"],
        "Microsoft Visual Studio",
        "Installer",
        "vswhere.exe",
      )
    : null;

  return candidatePath && existsFile(candidatePath) ? candidatePath : null;
}

function findLatestMsvcToolPath(installationPath) {
  const toolsRoot = path.join(installationPath, "VC", "Tools", "MSVC");

  if (!fsSync.existsSync(toolsRoot)) {
    return null;
  }

  let versions = [];

  try {
    versions = fsSync
      .readdirSync(toolsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left, "en"));
  } catch {
    return null;
  }

  if (versions.length === 0) {
    return null;
  }

  const latestVersion = versions[0];
  const compilerPath = path.join(
    toolsRoot,
    latestVersion,
    "bin",
    "Hostx64",
    "x64",
    "cl.exe",
  );

  return existsFile(compilerPath) ? compilerPath : null;
}

function listVisualStudioToolchains(candidateMap) {
  const vswherePath = resolveVsWherePath();

  if (!vswherePath) {
    return;
  }

  const result = spawnSync(
    vswherePath,
    [
      "-latest",
      "-products",
      "*",
      "-requires",
      "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
      "-property",
      "installationPath",
    ],
    {
      encoding: "utf-8",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    return;
  }

  const installationPath = `${result.stdout ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!installationPath) {
    return;
  }

  const setupScriptPath = path.join(
    installationPath,
    "VC",
    "Auxiliary",
    "Build",
    "vcvars64.bat",
  );
  const compilerPath = findLatestMsvcToolPath(installationPath);

  if (!existsFile(setupScriptPath) || !compilerPath) {
    return;
  }

  addToolchainCandidate(candidateMap, {
    kind: "msvc",
    label: "MSVC (Visual Studio)",
    path: compilerPath,
    setupScriptPath,
    isRecommended: false,
  });
}

export function listCppToolchains() {
  const candidateMap = new Map();

  listPathCompilers(candidateMap);
  listVisualStudioToolchains(candidateMap);

  return [...candidateMap.values()].sort((left, right) => {
    if (left.isRecommended !== right.isRecommended) {
      return left.isRecommended ? -1 : 1;
    }

    return left.label.localeCompare(right.label, "ru");
  });
}

export function resolveCppToolchain({ compilerPath } = {}) {
  const normalizedCompilerPath = `${compilerPath ?? ""}`.trim();

  if (normalizedCompilerPath && normalizedCompilerPath !== "auto") {
    const matchingToolchain = listCppToolchains().find((toolchain) => {
      if (!toolchain.path) {
        return false;
      }

      return normalizePathCase(toolchain.path) === normalizePathCase(normalizedCompilerPath);
    });

    if (matchingToolchain) {
      return matchingToolchain;
    }

    const resolvedPath = path.resolve(normalizedCompilerPath);

    if (!existsFile(resolvedPath)) {
      throw new Error(`Компилятор C++ не найден: ${resolvedPath}`);
    }

    return createToolchainDescriptor({
      kind: path.basename(resolvedPath).toLowerCase() === "cl.exe" ? "msvc" : "custom",
      label: path.basename(resolvedPath),
      path: resolvedPath,
      isRecommended: false,
    });
  }

  const toolchains = listCppToolchains();

  if (toolchains.length === 0) {
    throw new Error("Не удалось найти доступный C++ компилятор на этом компьютере.");
  }

  return toolchains[0];
}
