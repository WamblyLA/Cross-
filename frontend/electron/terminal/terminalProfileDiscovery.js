import fs from "fs/promises";
import path from "path";

function createProfile({
  id,
  label,
  shellType,
  command,
  args = [],
  source,
  isAvailable = true,
}) {
  return {
    id,
    label,
    shellType,
    command,
    args,
    source,
    isAvailable,
  };
}

function normalizeExecutableExtensions() {
  if (process.platform !== "win32") {
    return [""];
  }

  return (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
    .split(";")
    .map((extension) => extension.trim())
    .filter(Boolean);
}

async function pathExists(targetPath) {
  if (!targetPath) {
    return false;
  }

  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveExecutableFromPath(command) {
  if (!command) {
    return null;
  }

  if (path.isAbsolute(command)) {
    return (await pathExists(command)) ? command : null;
  }

  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const executableExtensions = normalizeExecutableExtensions();

  for (const entry of pathEntries) {
    const directCandidate = path.join(entry, command);

    if (await pathExists(directCandidate)) {
      return directCandidate;
    }

    for (const extension of executableExtensions) {
      const candidatePath = path.join(entry, `${command}${extension}`);

      if (await pathExists(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

async function resolveCandidateExecutable(candidate) {
  if (candidate.command) {
    const resolvedFromCommand = await resolveExecutableFromPath(candidate.command);

    if (resolvedFromCommand) {
      return resolvedFromCommand;
    }
  }

  for (const knownPath of candidate.knownPaths ?? []) {
    if (await pathExists(knownPath)) {
      return knownPath;
    }
  }

  return null;
}

function getWindowsCandidates() {
  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const localAppData = process.env.LOCALAPPDATA ?? "";

  return [
    {
      id: "pwsh",
      label: "PowerShell",
      shellType: "pwsh",
      command: "pwsh.exe",
      args: ["-NoLogo"],
      source: "path",
    },
    {
      id: "powershell",
      label: "Windows PowerShell",
      shellType: "powershell",
      command: "powershell.exe",
      args: ["-NoLogo"],
      source: "system",
    },
    {
      id: "cmd",
      label: "Command Prompt",
      shellType: "cmd",
      command: "cmd.exe",
      args: [],
      source: "system",
    },
    {
      id: "git-bash",
      label: "Git Bash",
      shellType: "git-bash",
      command: "bash.exe",
      args: ["--login", "-i"],
      source: "known-install",
      knownPaths: [
        path.join(programFiles, "Git", "bin", "bash.exe"),
        path.join(programFiles, "Git", "usr", "bin", "bash.exe"),
        path.join(localAppData, "Programs", "Git", "bin", "bash.exe"),
        path.join(localAppData, "Programs", "Git", "usr", "bin", "bash.exe"),
      ],
    },
    {
      id: "wsl",
      label: "WSL",
      shellType: "wsl",
      command: "wsl.exe",
      args: [],
      source: "system",
    },
  ];
}

function getPosixCandidates() {
  const shellFromEnv = process.env.SHELL
    ? [
        {
          id: `env-shell:${path.basename(process.env.SHELL)}`,
          label: path.basename(process.env.SHELL),
          shellType: "env-shell",
          command: process.env.SHELL,
          args: ["-l"],
          source: "env",
        },
      ]
    : [];

  return [
    ...shellFromEnv,
    {
      id: "zsh",
      label: "Zsh",
      shellType: "zsh",
      command: "/bin/zsh",
      args: ["-l"],
      source: "system",
    },
    {
      id: "bash",
      label: "Bash",
      shellType: "bash",
      command: "/bin/bash",
      args: ["-l"],
      source: "system",
    },
    {
      id: "sh",
      label: "Shell",
      shellType: "sh",
      command: "/bin/sh",
      args: ["-l"],
      source: "system",
    },
    {
      id: "fish",
      label: "Fish",
      shellType: "fish",
      command: "fish",
      args: ["-l"],
      source: "path",
    },
  ];
}

function getPlatformCandidates() {
  return process.platform === "win32" ? getWindowsCandidates() : getPosixCandidates();
}

function dedupeProfiles(profiles) {
  const seenIds = new Set();
  const seenCommands = new Set();
  const result = [];

  for (const profile of profiles) {
    const commandKey = path.resolve(profile.command).toLowerCase();

    if (seenIds.has(profile.id) || seenCommands.has(commandKey)) {
      continue;
    }

    seenIds.add(profile.id);
    seenCommands.add(commandKey);
    result.push(profile);
  }

  return result;
}

export function createFallbackTerminalProfiles() {
  return getPlatformCandidates().map((candidate) =>
    createProfile({
      ...candidate,
      command: candidate.knownPaths?.[0] ?? candidate.command,
      isAvailable: true,
    }),
  );
}

export async function discoverTerminalProfiles() {
  const candidates = getPlatformCandidates();
  const resolvedProfiles = await Promise.all(
    candidates.map(async (candidate) => {
      const resolvedCommand = await resolveCandidateExecutable(candidate);

      if (!resolvedCommand) {
        return null;
      }

      return createProfile({
        ...candidate,
        command: resolvedCommand,
        isAvailable: true,
      });
    }),
  );

  return dedupeProfiles(resolvedProfiles.filter(Boolean));
}
