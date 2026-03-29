import fsSync from "fs";
import fs from "fs/promises";
import path from "path";

const ARGUMENT_WHITESPACE = /\s/;

export function createRunId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizePathCase(filePath) {
  const resolvedPath = path.resolve(filePath);
  return process.platform === "win32" ? resolvedPath.toLowerCase() : resolvedPath;
}

export function existsFile(filePath) {
  try {
    return fsSync.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function existsDirectory(filePath) {
  try {
    return fsSync.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

export async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

export async function ensureEmptyDirectory(directoryPath) {
  await fs.rm(directoryPath, { recursive: true, force: true });
  await fs.mkdir(directoryPath, { recursive: true });
}

export function getExecutableExtensions() {
  if (process.platform !== "win32") {
    return [""];
  }

  return (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
    .split(";")
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveExecutablePath(command) {
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

  const extensions = getExecutableExtensions();

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

export function parseArgumentsText(argumentsText) {
  const source = `${argumentsText ?? ""}`.trim();

  if (!source) {
    return [];
  }

  const argumentsList = [];
  let currentToken = "";
  let activeQuote = null;
  let isEscaping = false;

  for (const character of source) {
    if (isEscaping) {
      currentToken += character;
      isEscaping = false;
      continue;
    }

    if (character === "\\") {
      isEscaping = true;
      continue;
    }

    if (activeQuote) {
      if (character === activeQuote) {
        activeQuote = null;
      } else {
        currentToken += character;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      activeQuote = character;
      continue;
    }

    if (ARGUMENT_WHITESPACE.test(character)) {
      if (currentToken) {
        argumentsList.push(currentToken);
        currentToken = "";
      }
      continue;
    }

    currentToken += character;
  }

  if (isEscaping) {
    currentToken += "\\";
  }

  if (activeQuote) {
    throw new Error("Аргументы запуска содержат незакрытую кавычку.");
  }

  if (currentToken) {
    argumentsList.push(currentToken);
  }

  return argumentsList;
}

export function parseEnvironmentText(environmentText) {
  const rawText = `${environmentText ?? ""}`.trim();

  if (!rawText) {
    return {};
  }

  const environment = {};

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      throw new Error(`Некорректная переменная окружения: ${line}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);

    if (!key) {
      throw new Error(`Некорректная переменная окружения: ${line}`);
    }

    environment[key] = value;
  }

  return environment;
}

export function quoteWindowsArgument(value) {
  const normalizedValue = `${value ?? ""}`;

  if (!normalizedValue) {
    return '""';
  }

  if (!/[ \t"]/u.test(normalizedValue)) {
    return normalizedValue;
  }

  return `"${normalizedValue
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\+)$/g, "$1$1")}"`;
}

export function buildWindowsCommandLine(command, args = []) {
  return [command, ...args].map((part) => quoteWindowsArgument(part)).join(" ");
}

export function basenameWithoutExtension(filePath) {
  return path.parse(filePath).name;
}

export function toErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallbackMessage;
}