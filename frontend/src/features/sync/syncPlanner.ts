import { hashText } from "./syncHash";
import { resolveLocalFsPath } from "./syncPaths";
import type {
  CloudSyncSnapshot,
  LinkedWorkspaceBinding,
  LocalSyncSnapshot,
  SyncDirection,
  SyncPlanItem,
  SyncPreview,
  SyncPreviewItemState,
  SyncScope,
} from "./syncTypes";

type PlannerInput = {
  binding: LinkedWorkspaceBinding;
  direction: SyncDirection;
  scope: SyncScope;
  targetRelativePath?: string | null;
  localSnapshot: LocalSyncSnapshot;
  cloudSnapshot: CloudSyncSnapshot;
  blockingRelativePaths: Set<string>;
};

function buildPreviewId(bindingId: string, direction: SyncDirection, scope: SyncScope) {
  return `${bindingId}:${direction}:${scope}:${Date.now()}`;
}

function makeItem(input: Omit<SyncPlanItem, "depth">): SyncPlanItem {
  return {
    ...input,
    depth: input.relativePath ? input.relativePath.split("/").length : 0,
  };
}

function sortItems(items: SyncPlanItem[]) {
  return [...items].sort((left, right) => {
    if (left.action === "delete" && right.action !== "delete") {
      return 1;
    }

    if (left.action !== "delete" && right.action === "delete") {
      return -1;
    }

    if (left.kind !== right.kind) {
      return left.kind === "folder" ? -1 : 1;
    }

    return left.relativePath.localeCompare(right.relativePath, "ru");
  });
}

function resolveDeleteState(blockedByDirtyTab: boolean): SyncPreviewItemState {
  return blockedByDirtyTab ? "blocked_dirty_buffer" : "pending_delete_confirm";
}

export function buildSyncPreview({
  binding,
  direction,
  scope,
  targetRelativePath = null,
  localSnapshot,
  cloudSnapshot,
  blockingRelativePaths,
}: PlannerInput): SyncPreview {
  const localFolders = new Map(localSnapshot.folders.map((folder) => [folder.relativePath, folder]));
  const localFiles = new Map(localSnapshot.files.map((file) => [file.relativePath, file]));
  const cloudFolders = new Map(cloudSnapshot.folders.map((folder) => [folder.relativePath, folder]));
  const cloudFiles = new Map(cloudSnapshot.files.map((file) => [file.relativePath, file]));
  const items: SyncPlanItem[] = [];

  const includePath = (relativePath: string) => {
    if (!targetRelativePath) {
      return true;
    }

    return relativePath === targetRelativePath || relativePath.startsWith(`${targetRelativePath}/`);
  };

  const addItem = (item: SyncPlanItem | null) => {
    if (!item || item.action === null) {
      return;
    }

    items.push(item);
  };

  const folderPaths = new Set([...localFolders.keys(), ...cloudFolders.keys()]);

  for (const relativePath of folderPaths) {
    if (!includePath(relativePath)) {
      continue;
    }

    const localFolder = localFolders.get(relativePath) ?? null;
    const cloudFolder = cloudFolders.get(relativePath) ?? null;
    const blockedByDirtyTab = blockingRelativePaths.has(relativePath);

    if (direction === "push" && localFolder && !cloudFolder) {
      addItem(
        makeItem({
          relativePath,
          kind: "folder",
          state: "local_only",
          action: "create",
          reason: "Папка будет создана в облаке.",
          requiresDeleteConfirm: false,
          blockedByDirtyTab,
          localExists: true,
          cloudExists: false,
          localPath: localFolder.path,
          cloudFileId: null,
          cloudFolderId: null,
          localHash: null,
          cloudHash: null,
          cloudVersion: null,
        }),
      );
    }

    if (direction === "push" && !localFolder && cloudFolder) {
      addItem(
        makeItem({
          relativePath,
          kind: "folder",
          state: resolveDeleteState(blockedByDirtyTab),
          action: "delete",
          reason: "Папка будет удалена из облака.",
          requiresDeleteConfirm: true,
          blockedByDirtyTab,
          localExists: false,
          cloudExists: true,
          localPath: null,
          cloudFileId: null,
          cloudFolderId: cloudFolder.id,
          localHash: null,
          cloudHash: null,
          cloudVersion: null,
        }),
      );
    }

    if (direction === "pull" && cloudFolder && !localFolder) {
      addItem(
        makeItem({
          relativePath,
          kind: "folder",
          state: "cloud_only",
          action: "create",
          reason: "Папка будет создана локально.",
          requiresDeleteConfirm: false,
            blockedByDirtyTab,
            localExists: false,
            cloudExists: true,
            localPath: binding.localRootPath
              ? resolveLocalFsPath(binding.localRootPath, relativePath)
              : null,
            cloudFileId: null,
          cloudFolderId: cloudFolder.id,
          localHash: null,
          cloudHash: null,
          cloudVersion: null,
        }),
      );
    }

    if (direction === "pull" && !cloudFolder && localFolder) {
      addItem(
        makeItem({
          relativePath,
          kind: "folder",
          state: resolveDeleteState(blockedByDirtyTab),
          action: "delete",
          reason: "Папка будет удалена локально.",
          requiresDeleteConfirm: true,
          blockedByDirtyTab,
          localExists: true,
          cloudExists: false,
          localPath: localFolder.path,
          cloudFileId: null,
          cloudFolderId: null,
          localHash: null,
          cloudHash: null,
          cloudVersion: null,
        }),
      );
    }
  }

  const filePaths = new Set([...localFiles.keys(), ...cloudFiles.keys()]);

  for (const relativePath of filePaths) {
    if (!includePath(relativePath)) {
      continue;
    }

    const localFile = localFiles.get(relativePath) ?? null;
    const cloudFile = cloudFiles.get(relativePath) ?? null;
    const blockedByDirtyTab = blockingRelativePaths.has(relativePath);

    if (localFile && cloudFile) {
      const cloudHash = hashText(cloudFile.content);

      if (localFile.hash !== cloudHash) {
        addItem(
          makeItem({
            relativePath,
            kind: "file",
            state: blockedByDirtyTab ? "blocked_dirty_buffer" : "different",
            action: "update",
            reason:
              direction === "push"
                ? "Локальная версия перезапишет файл в облаке."
                : "Облачная версия перезапишет локальный файл.",
            requiresDeleteConfirm: false,
            blockedByDirtyTab,
            localExists: true,
            cloudExists: true,
            localPath: localFile.path,
            cloudFileId: cloudFile.id,
            cloudFolderId: cloudFile.folderId,
            localHash: localFile.hash,
            cloudHash,
            cloudVersion: cloudFile.version,
          }),
        );
      }

      continue;
    }

    if (localFile && !cloudFile) {
      if (direction === "push") {
        addItem(
          makeItem({
            relativePath,
            kind: "file",
            state: blockedByDirtyTab ? "blocked_dirty_buffer" : "local_only",
            action: "create",
            reason: "Файл будет создан в облаке.",
            requiresDeleteConfirm: false,
            blockedByDirtyTab,
            localExists: true,
            cloudExists: false,
            localPath: localFile.path,
            cloudFileId: null,
            cloudFolderId: null,
            localHash: localFile.hash,
            cloudHash: null,
            cloudVersion: null,
          }),
        );
      } else {
        addItem(
          makeItem({
            relativePath,
            kind: "file",
            state: resolveDeleteState(blockedByDirtyTab),
            action: "delete",
            reason: "Локальный файл будет удалён.",
            requiresDeleteConfirm: true,
            blockedByDirtyTab,
            localExists: true,
            cloudExists: false,
            localPath: localFile.path,
            cloudFileId: null,
            cloudFolderId: null,
            localHash: localFile.hash,
            cloudHash: null,
            cloudVersion: null,
          }),
        );
      }
    }

    if (!localFile && cloudFile) {
      const cloudHash = hashText(cloudFile.content);

      if (direction === "pull") {
        addItem(
          makeItem({
            relativePath,
            kind: "file",
            state: blockedByDirtyTab ? "blocked_dirty_buffer" : "cloud_only",
            action: "create",
            reason: "Файл будет создан локально.",
            requiresDeleteConfirm: false,
            blockedByDirtyTab,
            localExists: false,
            cloudExists: true,
            localPath: binding.localRootPath
              ? resolveLocalFsPath(binding.localRootPath, relativePath)
              : null,
            cloudFileId: cloudFile.id,
            cloudFolderId: cloudFile.folderId,
            localHash: null,
            cloudHash,
            cloudVersion: cloudFile.version,
          }),
        );
      } else {
        addItem(
          makeItem({
            relativePath,
            kind: "file",
            state: resolveDeleteState(blockedByDirtyTab),
            action: "delete",
            reason: "Файл будет удалён из облака.",
            requiresDeleteConfirm: true,
            blockedByDirtyTab,
            localExists: false,
            cloudExists: true,
            localPath: null,
            cloudFileId: cloudFile.id,
            cloudFolderId: cloudFile.folderId,
            localHash: null,
            cloudHash,
            cloudVersion: cloudFile.version,
          }),
        );
      }
    }
  }

  const summary = items.reduce(
    (accumulator, item) => {
      if (item.action === "create") {
        accumulator.createCount += 1;
      } else if (item.action === "update") {
        accumulator.updateCount += 1;
      } else if (item.action === "delete") {
        accumulator.deleteCount += 1;
      }

      if (item.blockedByDirtyTab) {
        accumulator.blockedCount += 1;
      }

      return accumulator;
    },
    { createCount: 0, updateCount: 0, deleteCount: 0, blockedCount: 0 },
  );

  return {
    id: buildPreviewId(binding.id, direction, scope),
    bindingId: binding.id,
    direction,
    scope,
    targetRelativePath: scope === "file" ? targetRelativePath : null,
    createdAt: new Date().toISOString(),
    items: sortItems(items),
    summary,
  };
}
