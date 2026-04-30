import path from "path";
import { spawn } from "child_process";

function normalizePathCase(filePath) {
  const resolvedPath = path.resolve(filePath);
  return process.platform === "win32" ? resolvedPath.toLowerCase() : resolvedPath;
}

function isPathInsideRoot(targetPath, rootPath) {
  const normalizedTarget = normalizePathCase(targetPath);
  const normalizedRoot = normalizePathCase(rootPath);

  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}${path.sep.toLowerCase()}`)
  );
}

function toPosixRelativePath(rootPath, targetPath) {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath.split(path.sep).join("/");
}

function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr.trim() || `git exited with code ${code ?? "unknown"}`));
    });
  });
}

function classifyGitStatus(xy) {
  if (xy === "??") {
    return "untracked";
  }

  const codes = new Set(xy.replace(/\s+/g, "").split(""));

  if (codes.has("R") || codes.has("C")) {
    return "renamed";
  }

  if (codes.has("D")) {
    return "deleted";
  }

  if (codes.has("A")) {
    return "added";
  }

  if (codes.has("M") || codes.has("T") || codes.has("U")) {
    return "modified";
  }

  return null;
}

function assignStatus(statusesByRelativePath, relativePath, nextStatus) {
  if (!relativePath || !nextStatus) {
    return;
  }

  statusesByRelativePath[relativePath] = nextStatus;
}

function toWorkspaceRelativePath(repoRootPath, workspaceRootPath, repoRelativePath) {
  if (!repoRelativePath) {
    return null;
  }

  const absolutePath = path.resolve(repoRootPath, repoRelativePath);

  if (!isPathInsideRoot(absolutePath, workspaceRootPath)) {
    return null;
  }

  return toPosixRelativePath(workspaceRootPath, absolutePath);
}

function parseGitStatusOutput(output, repoRootPath, workspaceRootPath) {
  const statusesByRelativePath = {};
  const tokens = output.split("\0").filter(Boolean);

  for (let index = 0; index < tokens.length; index += 1) {
    const entry = tokens[index];
    const statusCode = entry.slice(0, 2);
    const primaryPath = entry.slice(3);
    const normalizedStatus = classifyGitStatus(statusCode);

    if (!normalizedStatus) {
      continue;
    }

    const primaryRelativePath = toWorkspaceRelativePath(
      repoRootPath,
      workspaceRootPath,
      primaryPath,
    );
    assignStatus(statusesByRelativePath, primaryRelativePath, normalizedStatus);

    if (normalizedStatus === "renamed") {
      const previousPath = tokens[index + 1] ?? "";
      const previousRelativePath = toWorkspaceRelativePath(
        repoRootPath,
        workspaceRootPath,
        previousPath,
      );

      assignStatus(statusesByRelativePath, previousRelativePath, normalizedStatus);
      index += 1;
    }
  }

  return statusesByRelativePath;
}

function createEmptyGitState() {
  return {
    available: false,
    repositoryRootPath: null,
    statusesByRelativePath: {},
  };
}

export async function getWorkspaceGitStatus(workspaceRootPath) {
  if (!workspaceRootPath) {
    return createEmptyGitState();
  }

  try {
    const repositoryRootPath = (await runGit(["rev-parse", "--show-toplevel"], workspaceRootPath)).trim();

    if (!repositoryRootPath) {
      return createEmptyGitState();
    }

    const output = await runGit(
      ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
      repositoryRootPath,
    );

    return {
      available: true,
      repositoryRootPath,
      statusesByRelativePath: parseGitStatusOutput(
        output,
        repositoryRootPath,
        workspaceRootPath,
      ),
    };
  } catch {
    return createEmptyGitState();
  }
}
