import fs from "fs/promises";
import path from "path";
import { ensureDirectory, ensureEmptyDirectory } from "./utils.js";

export function createCloudMaterializer({ app }) {
  const getCloudCacheRoot = () => path.join(app.getPath("userData"), "run-cache", "cloud");
  const getSessionCacheRoot = () => path.join(app.getPath("userData"), "run-cache", "sessions");

  async function materializeSnapshot(snapshot) {
    if (!snapshot?.projectId) {
      throw new Error("Не удалось подготовить локальную копию облачного проекта для запуска.");
    }

    const workspaceRootPath = path.join(getCloudCacheRoot(), snapshot.projectId, "workspace");
    const sortedFolders = [...(snapshot.folders ?? [])].sort(
      (left, right) => left.relativePath.length - right.relativePath.length,
    );
    const filePathById = {};

    await ensureEmptyDirectory(workspaceRootPath);

    for (const folder of sortedFolders) {
      await ensureDirectory(path.join(workspaceRootPath, folder.relativePath));
    }

    for (const file of snapshot.files ?? []) {
      const targetPath = path.join(workspaceRootPath, file.relativePath);
      await ensureDirectory(path.dirname(targetPath));
      await fs.writeFile(targetPath, file.content ?? "", "utf-8");
      filePathById[file.id] = targetPath;
    }

    return {
      projectRootPath: workspaceRootPath,
      filePathById,
    };
  }

  async function prepareSessionDirectory(sessionId) {
    const sessionDirectory = path.join(getSessionCacheRoot(), sessionId);
    await ensureEmptyDirectory(sessionDirectory);
    return sessionDirectory;
  }

  return {
    materializeSnapshot,
    prepareSessionDirectory,
  };
}
