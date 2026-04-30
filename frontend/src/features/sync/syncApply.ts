import * as cloudApi from "../cloud/cloudApi";
import { joinFsPath } from "../../utils/path";
import { resolveLocalFsPath } from "./syncPaths";
import { readLocalFileContent } from "./syncSnapshots";
import type { CloudSyncSnapshot, SyncPlanItem } from "./syncTypes";

function sortByDepthAscending(items: SyncPlanItem[]) {
  return [...items].sort((left, right) => left.depth - right.depth);
}

function sortByDepthDescending(items: SyncPlanItem[]) {
  return [...items].sort((left, right) => right.depth - left.depth);
}

function buildFolderMap(cloudSnapshot: CloudSyncSnapshot) {
  return new Map(cloudSnapshot.folders.map((folder) => [folder.relativePath, folder.id]));
}

async function ensureLocalFolder(rootPath: string, relativePath: string) {
  const segments = relativePath.split("/").filter(Boolean);
  let currentPath = rootPath;

  for (const segment of segments) {
    const nextPath = joinFsPath(currentPath, segment);

    try {
      await window.electronAPI.createFileSystemItem(currentPath, segment, true);
    } catch {
      // Folder may already exist.
    }

    currentPath = nextPath;
  }
}

async function createMissingCloudFolders(
  projectId: string,
  items: SyncPlanItem[],
  cloudSnapshot: CloudSyncSnapshot,
) {
  const folderIdByRelativePath = buildFolderMap(cloudSnapshot);

  for (const item of sortByDepthAscending(items)) {
    if (item.kind !== "folder" || item.action !== "create") {
      continue;
    }

    const segments = item.relativePath.split("/");
    const folderName = segments.at(-1);
    const parentRelativePath = segments.slice(0, -1).join("/");
    const parentId = parentRelativePath
      ? folderIdByRelativePath.get(parentRelativePath) ?? null
      : null;

    if (!folderName || folderIdByRelativePath.has(item.relativePath)) {
      continue;
    }

    const response = await cloudApi.createProjectFolder(projectId, {
      name: folderName,
      parentId,
    });

    folderIdByRelativePath.set(item.relativePath, response.folder.id);
  }

  return folderIdByRelativePath;
}

export async function applyPushPlan(input: {
  items: SyncPlanItem[];
  cloudSnapshot: CloudSyncSnapshot;
  localRootPath: string;
}) {
  const folderIds = await createMissingCloudFolders(
    input.cloudSnapshot.projectId,
    input.items,
    input.cloudSnapshot,
  );

  for (const item of input.items) {
    if (item.kind !== "file" || (item.action !== "create" && item.action !== "update")) {
      continue;
    }

    const content = await readLocalFileContent(input.localRootPath, item.relativePath);
    const name = item.relativePath.split("/").at(-1);
    const parentRelativePath = item.relativePath.split("/").slice(0, -1).join("/");
    const folderId = parentRelativePath ? folderIds.get(parentRelativePath) ?? null : null;

    if (content === null || !name) {
      continue;
    }

    if (item.action === "create") {
      await cloudApi.createProjectFile(input.cloudSnapshot.projectId, {
        name,
        content,
        folderId,
      });
      continue;
    }

    if (!item.cloudFileId) {
      continue;
    }

    await cloudApi.updateProjectFile(input.cloudSnapshot.projectId, item.cloudFileId, {
      content,
      expectedVersion: item.cloudVersion ?? undefined,
    });
  }

  for (const item of input.items.filter((entry) => entry.kind === "file" && entry.action === "delete")) {
    if (!item.cloudFileId) {
      continue;
    }

    await cloudApi.deleteProjectFile(input.cloudSnapshot.projectId, item.cloudFileId);
  }

  for (const item of sortByDepthDescending(input.items)) {
    if (item.kind !== "folder" || item.action !== "delete" || !item.cloudFolderId) {
      continue;
    }

    await cloudApi.deleteProjectFolder(input.cloudSnapshot.projectId, item.cloudFolderId);
  }
}

export async function applyPullPlan(input: {
  items: SyncPlanItem[];
  projectId: string;
  localRootPath: string;
}) {
  for (const item of sortByDepthAscending(input.items)) {
    if (item.kind === "folder" && item.action === "create") {
      await ensureLocalFolder(input.localRootPath, item.relativePath);
    }
  }

  for (const item of input.items) {
    if (item.kind !== "file" || (item.action !== "create" && item.action !== "update")) {
      continue;
    }

    if (!item.cloudFileId) {
      continue;
    }

    const response = await cloudApi.getProjectFile(input.projectId, item.cloudFileId);
    const cloudFile = response.file;
    const segments = item.relativePath.split("/").filter(Boolean);
    const fileName = segments.at(-1);
    const parentRelativePath = segments.slice(0, -1).join("/");
    const parentPath = parentRelativePath
      ? resolveLocalFsPath(input.localRootPath, parentRelativePath)
      : input.localRootPath;
    const filePath = joinFsPath(parentPath, fileName ?? "");

    if (!fileName) {
      continue;
    }

    if (parentRelativePath) {
      await ensureLocalFolder(input.localRootPath, parentRelativePath);
    }

    await window.electronAPI.writeFile(filePath, cloudFile.content);
  }

  for (const item of input.items.filter((entry) => entry.kind === "file" && entry.action === "delete")) {
    if (!item.localPath) {
      continue;
    }

    await window.electronAPI.removeFileSystemItem(item.localPath);
  }

  for (const item of sortByDepthDescending(input.items)) {
    if (item.kind !== "folder" || item.action !== "delete" || !item.localPath) {
      continue;
    }

    await window.electronAPI.removeFileSystemItem(item.localPath);
  }
}
