import { hashText } from "./syncHash";
import { toSyncRelativePath } from "./syncPaths";
import type {
  CloudSyncSnapshot,
  LinkedWorkspaceBinding,
  LocalSyncSnapshot,
  SyncPlanItem,
} from "./syncTypes";
import type { StateType } from "../../store/store";

export function collectBlockingDirtyTabs(
  filesState: StateType["files"],
  binding: LinkedWorkspaceBinding,
  cloudSnapshot: CloudSyncSnapshot,
) {
  const cloudRelativePathByFileId = new Map(
    cloudSnapshot.files.map((file) => [file.id, file.relativePath]),
  );
  const blockingRelativePaths = new Set<string>();

  for (const openedFile of filesState.openedFiles) {
    if (!openedFile.isDirty) {
      continue;
    }

    if (openedFile.kind === "local" && binding.localRootPath) {
      const relativePath = toSyncRelativePath(binding.localRootPath, openedFile.path);

      if (relativePath) {
        blockingRelativePaths.add(relativePath);
      }
    }

    if (openedFile.kind === "cloud" && openedFile.projectId === binding.projectId) {
      const relativePath = cloudRelativePathByFileId.get(openedFile.fileId);

      if (relativePath) {
        blockingRelativePaths.add(relativePath);
      }
    }
  }

  return blockingRelativePaths;
}

export function assertLocalPreconditions(items: SyncPlanItem[], localSnapshot: LocalSyncSnapshot) {
  const currentFiles = new Map(localSnapshot.files.map((file) => [file.relativePath, file]));
  const currentFolders = new Set(localSnapshot.folders.map((folder) => folder.relativePath));

  for (const item of items) {
    if (item.kind === "folder") {
      const currentExists = currentFolders.has(item.relativePath);

      if (item.localExists !== currentExists) {
        return {
          ok: false,
          error: `Локальная папка "${item.relativePath}" изменилась после preview.`,
        };
      }

      continue;
    }

    const currentFile = currentFiles.get(item.relativePath) ?? null;
    const currentHash = currentFile ? hashText(currentFile.content) : null;
    const currentExists = Boolean(currentFile);

    if (item.localExists !== currentExists || item.localHash !== currentHash) {
      return {
        ok: false,
        error: `Локальный файл "${item.relativePath}" изменился после preview.`,
      };
    }
  }

  return { ok: true as const };
}

export function assertCloudPreconditions(items: SyncPlanItem[], cloudSnapshot: CloudSyncSnapshot) {
  const currentFiles = new Map(cloudSnapshot.files.map((file) => [file.relativePath, file]));
  const currentFolders = new Map(cloudSnapshot.folders.map((folder) => [folder.relativePath, folder]));

  for (const item of items) {
    if (item.kind === "folder") {
      const currentFolder = currentFolders.get(item.relativePath) ?? null;
      const currentExists = Boolean(currentFolder);

      if (item.cloudExists !== currentExists) {
        return {
          ok: false,
          error: `Облачная папка "${item.relativePath}" изменилась после preview.`,
        };
      }

      continue;
    }

    const currentFile = currentFiles.get(item.relativePath) ?? null;
    const currentHash = currentFile ? hashText(currentFile.content) : null;
    const currentExists = Boolean(currentFile);
    const currentVersion = currentFile?.version ?? null;

    if (
      item.cloudExists !== currentExists ||
      item.cloudHash !== currentHash ||
      item.cloudVersion !== currentVersion
    ) {
      return {
        ok: false,
        error: `Облачный файл "${item.relativePath}" изменился после preview.`,
      };
    }
  }

  return { ok: true as const };
}
