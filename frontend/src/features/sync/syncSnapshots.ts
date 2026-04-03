import * as cloudApi from "../cloud/cloudApi";
import { hashText } from "./syncHash";
import { resolveLocalFsPath } from "./syncPaths";
import type {
  CloudSyncSnapshot,
  LocalSnapshotFile,
  LocalSnapshotFolder,
  LocalSyncSnapshot,
} from "./syncTypes";

function joinRelativePath(parentRelativePath: string, name: string) {
  return parentRelativePath ? `${parentRelativePath}/${name}` : name;
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

    const content = await window.electronAPI.readFile(entry.path);
    files.push({
      relativePath,
      path: entry.path,
      content,
      hash: hashText(content),
    });
  }
}

export async function buildLocalSyncSnapshot(rootPath: string): Promise<LocalSyncSnapshot> {
  const folders: LocalSnapshotFolder[] = [];
  const files: LocalSnapshotFile[] = [];

  await walkLocalDirectory(rootPath, "", folders, files);

  return {
    rootPath,
    folders,
    files,
  };
}

export async function buildCloudSyncSnapshot(projectId: string): Promise<CloudSyncSnapshot> {
  const response = await cloudApi.getProjectRunSnapshot(projectId);

  return {
    projectId: response.snapshot.projectId,
    projectName: response.snapshot.projectName,
    folders: response.snapshot.folders.map((folder) => ({
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      relativePath: folder.relativePath,
    })),
    files: response.snapshot.files.map((file) => ({
      id: file.id,
      folderId: file.folderId,
      name: file.name,
      relativePath: file.relativePath,
      content: file.content,
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
