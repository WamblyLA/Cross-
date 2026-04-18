import * as cloudApi from "../cloud/cloudApi";
import { hashText } from "./syncHash";
import { resolveLocalFsPath } from "./syncPaths";
import type {
  CloudSyncSnapshot,
  LocalSnapshotFile,
  LocalSnapshotFolder,
  LocalSyncSnapshot,
} from "./syncTypes";

type SnapshotBuildOptions = {
  targetRelativePath?: string | null;
};

type LocalHashCacheEntry = {
  size: number | null;
  mtimeMs: number | null;
  hash: string;
};

const localHashCache = new Map<string, LocalHashCacheEntry>();

function joinRelativePath(parentRelativePath: string, name: string) {
  return parentRelativePath ? `${parentRelativePath}/${name}` : name;
}

async function resolveLocalFileHash(entry: FileSystemItem) {
  const cacheEntry = localHashCache.get(entry.path) ?? null;
  const size = entry.size ?? null;
  const mtimeMs = entry.mtimeMs ?? null;

  if (cacheEntry && cacheEntry.size === size && cacheEntry.mtimeMs === mtimeMs) {
    return cacheEntry.hash;
  }

  const content = await window.electronAPI.readFile(entry.path);
  const hash = hashText(content);

  localHashCache.set(entry.path, {
    size,
    mtimeMs,
    hash,
  });

  return hash;
}

async function pushLocalFileSnapshot(
  entry: FileSystemItem,
  relativePath: string,
  files: LocalSnapshotFile[],
) {
  files.push({
    relativePath,
    path: entry.path,
    hash: await resolveLocalFileHash(entry),
    size: entry.size ?? null,
    mtimeMs: entry.mtimeMs ?? null,
  });
}

async function walkLocalDirectory(
  folderPath: string,
  parentRelativePath: string,
  folders: LocalSnapshotFolder[],
  files: LocalSnapshotFile[],
) {
  const entries = await window.electronAPI.listFolder(folderPath);

  for (const entry of entries) {
    const relativePath = joinRelativePath(parentRelativePath, entry.name);

    if (entry.isDirectory) {
      folders.push({
        relativePath,
        path: entry.path,
      });
      await walkLocalDirectory(entry.path, relativePath, folders, files);
      continue;
    }

    await pushLocalFileSnapshot(entry, relativePath, files);
  }
}

async function buildTargetedLocalSyncSnapshot(
  rootPath: string,
  targetRelativePath: string,
): Promise<LocalSyncSnapshot> {
  const folders: LocalSnapshotFolder[] = [];
  const files: LocalSnapshotFile[] = [];
  const segments = targetRelativePath.split("/").filter(Boolean);

  if (segments.length === 0) {
    return {
      rootPath,
      folders,
      files,
    };
  }

  let currentPath = rootPath;
  let currentRelativePath = "";

  for (let index = 0; index < segments.length; index += 1) {
    const entries = await window.electronAPI.listFolder(currentPath);
    const segment = segments[index];
    const matchedEntry = entries.find((entry) => entry.name === segment) ?? null;

    if (!matchedEntry) {
      break;
    }

    const nextRelativePath = joinRelativePath(currentRelativePath, segment);
    const isLeaf = index === segments.length - 1;

    if (matchedEntry.isDirectory) {
      folders.push({
        relativePath: nextRelativePath,
        path: matchedEntry.path,
      });
      currentPath = matchedEntry.path;
      currentRelativePath = nextRelativePath;
      continue;
    }

    if (!isLeaf) {
      break;
    }

    await pushLocalFileSnapshot(matchedEntry, nextRelativePath, files);
  }

  return {
    rootPath,
    folders,
    files,
  };
}

export async function buildLocalSyncSnapshot(
  rootPath: string,
  options?: SnapshotBuildOptions,
): Promise<LocalSyncSnapshot> {
  const targetRelativePath = options?.targetRelativePath ?? null;

  if (targetRelativePath) {
    return buildTargetedLocalSyncSnapshot(rootPath, targetRelativePath);
  }

  const folders: LocalSnapshotFolder[] = [];
  const files: LocalSnapshotFile[] = [];

  await walkLocalDirectory(rootPath, "", folders, files);

  return {
    rootPath,
    folders,
    files,
  };
}

export async function buildCloudSyncSnapshot(
  projectId: string,
  options?: SnapshotBuildOptions,
): Promise<CloudSyncSnapshot> {
  const response = await cloudApi.getProjectSyncManifest(projectId, {
    targetRelativePath: options?.targetRelativePath ?? null,
  });

  return {
    projectId: response.manifest.projectId,
    projectName: response.manifest.projectName,
    folders: response.manifest.folders.map((folder) => ({
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      relativePath: folder.relativePath,
    })),
    files: response.manifest.files.map((file) => ({
      id: file.id,
      folderId: file.folderId,
      name: file.name,
      relativePath: file.relativePath,
      contentHash: file.contentHash,
      contentSize: file.contentSize,
      version: file.version,
      updatedAt: file.updatedAt,
    })),
  };
}

export async function readLocalFileContent(rootPath: string, relativePath: string) {
  if (!relativePath) {
    return null;
  }

  const filePath = resolveLocalFsPath(rootPath, relativePath);
  return window.electronAPI.readFile(filePath);
}
