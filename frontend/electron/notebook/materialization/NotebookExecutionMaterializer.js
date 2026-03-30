import fs from "fs/promises";
import path from "path";
import { ensureDirectory, ensureEmptyDirectory } from "../../run/utils.js";
import { buildNotebookSessionDirectoryKey } from "../session/notebookSessionKey.js";

function sortFoldersByDepth(folders) {
  return [...folders].sort(
    (left, right) => left.relativePath.length - right.relativePath.length,
  );
}

export function createNotebookExecutionMaterializer({ app }) {
  const runtimeCacheRoot = path.join(app.getPath("userData"), "notebook-cache", "sessions");
  const runtimeDirectories = new Map();

  async function prepareLocalContext(context) {
    const notebookPath = path.resolve(context.notebookPath);

    return {
      runtimeId: context.runtimeId,
      notebookPath,
      workingDirectory: path.dirname(notebookPath),
      workspaceRootPath: context.workspaceRootPath ?? path.dirname(notebookPath),
      kind: "local",
    };
  }

  async function prepareCloudContext(context) {
    const sessionRoot = path.join(
      runtimeCacheRoot,
      buildNotebookSessionDirectoryKey(context),
    );
    const workspaceRootPath = path.join(sessionRoot, "workspace");
    const notebookFile = context.cloudSnapshot?.files?.find(
      (file) => file.id === context.fileId,
    );

    if (!notebookFile) {
      throw new Error("Не удалось подготовить облачный ноутбук для локального исполнения.");
    }

    await ensureEmptyDirectory(workspaceRootPath);

    for (const folder of sortFoldersByDepth(context.cloudSnapshot?.folders ?? [])) {
      await ensureDirectory(path.join(workspaceRootPath, folder.relativePath));
    }

    for (const file of context.cloudSnapshot?.files ?? []) {
      const targetPath = path.join(workspaceRootPath, file.relativePath);
      await ensureDirectory(path.dirname(targetPath));
      await fs.writeFile(targetPath, file.content ?? "", "utf-8");
    }

    runtimeDirectories.set(context.runtimeId, sessionRoot);

    return {
      runtimeId: context.runtimeId,
      notebookPath: path.join(workspaceRootPath, notebookFile.relativePath),
      workingDirectory: path.dirname(path.join(workspaceRootPath, notebookFile.relativePath)),
      workspaceRootPath,
      kind: "cloud",
      sessionRoot,
    };
  }

  async function prepareExecutionContext(context) {
    if (context.kind === "local") {
      return prepareLocalContext(context);
    }

    return prepareCloudContext(context);
  }

  async function disposeRuntime(runtimeId) {
    const sessionRoot = runtimeDirectories.get(runtimeId);

    if (!sessionRoot) {
      return;
    }

    runtimeDirectories.delete(runtimeId);
    await fs.rm(sessionRoot, { recursive: true, force: true });
  }

  async function disposeAll() {
    const runtimeIds = [...runtimeDirectories.keys()];

    for (const runtimeId of runtimeIds) {
      await disposeRuntime(runtimeId);
    }
  }

  return {
    prepareExecutionContext,
    disposeRuntime,
    disposeAll,
  };
}
