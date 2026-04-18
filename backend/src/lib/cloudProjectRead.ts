import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import type { File, Folder } from "../../generated/prisma/index.js";
import { AppError } from "./errors.js";
import { requireProjectReadAccess } from "./projectAccess.js";
import { prisma } from "./prisma.js";

export type CloudFolderSummary = Pick<
  Folder,
  "id" | "projectId" | "parentId" | "name" | "createdAt" | "updatedAt"
>;

export type CloudFileSummary = Pick<
  File,
  "id" | "projectId" | "folderId" | "name" | "version" | "createdAt" | "updatedAt"
>;

export type CloudFolderTreeNode = CloudFolderSummary & {
  folders: CloudFolderTreeNode[];
  files: CloudFileSummary[];
};

export type CloudProjectTree = {
  projectId: string;
  folders: CloudFolderTreeNode[];
  files: CloudFileSummary[];
};

export type CloudRunSnapshotFolder = CloudFolderSummary & {
  relativePath: string;
};

export type CloudRunSnapshotFile = Pick<
  File,
  "id" | "projectId" | "folderId" | "name" | "content" | "version" | "createdAt" | "updatedAt"
> & {
  relativePath: string;
};

export type CloudProjectRunSnapshot = {
  projectId: string;
  projectName: string;
  folders: CloudRunSnapshotFolder[];
  files: CloudRunSnapshotFile[];
};

export type CloudSyncManifestFolder = CloudFolderSummary & {
  relativePath: string;
};

export type CloudSyncManifestFile = Pick<
  File,
  "id" | "projectId" | "folderId" | "name" | "version" | "updatedAt"
> & {
  relativePath: string;
  contentHash: string;
  contentSize: number;
};

export type CloudProjectSyncManifest = {
  projectId: string;
  projectName: string;
  folders: CloudSyncManifestFolder[];
  files: CloudSyncManifestFile[];
};

type FolderPathRecord = Pick<Folder, "id" | "parentId" | "name">;

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, "ru"));
}

function joinRelativePath(parentPath: string | null, name: string) {
  return parentPath ? `${parentPath}/${name}` : name;
}

function hashFileContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function includesTargetRelativePath(
  candidateRelativePath: string,
  targetRelativePath: string | null,
  kind: "folder" | "file",
) {
  if (!targetRelativePath) {
    return true;
  }

  if (kind === "folder") {
    return (
      candidateRelativePath === targetRelativePath ||
      candidateRelativePath.startsWith(`${targetRelativePath}/`) ||
      targetRelativePath.startsWith(`${candidateRelativePath}/`)
    );
  }

  return (
    candidateRelativePath === targetRelativePath ||
    candidateRelativePath.startsWith(`${targetRelativePath}/`)
  );
}

function createFolderPathResolver(
  folders: FolderPathRecord[],
  missingFolderMessage: string,
) {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const folderPathCache = new Map<string, string>();

  const resolveFolderPath = (folderId: string): string => {
    const cachedPath = folderPathCache.get(folderId);

    if (cachedPath) {
      return cachedPath;
    }

    const folder = folderById.get(folderId);

    if (!folder) {
      throw new AppError(missingFolderMessage, 500);
    }

    const relativePath = joinRelativePath(
      folder.parentId ? resolveFolderPath(folder.parentId) : null,
      folder.name,
    );

    folderPathCache.set(folderId, relativePath);

    return relativePath;
  };

  return resolveFolderPath;
}

export function buildProjectTree(
  projectId: string,
  folders: CloudFolderSummary[],
  files: CloudFileSummary[],
): CloudProjectTree {
  const folderNodes = new Map<string, CloudFolderTreeNode>();

  for (const folder of folders) {
    folderNodes.set(folder.id, {
      ...folder,
      folders: [],
      files: [],
    });
  }

  const rootFolders: CloudFolderTreeNode[] = [];
  const rootFiles: CloudFileSummary[] = [];

  for (const folder of folders) {
    const node = folderNodes.get(folder.id);

    if (!node) {
      continue;
    }

    if (!folder.parentId) {
      rootFolders.push(node);
      continue;
    }

    const parentNode = folderNodes.get(folder.parentId);

    if (parentNode) {
      parentNode.folders.push(node);
    } else {
      rootFolders.push(node);
    }
  }

  for (const file of files) {
    if (!file.folderId) {
      rootFiles.push(file);
      continue;
    }

    const parentNode = folderNodes.get(file.folderId);

    if (parentNode) {
      parentNode.files.push(file);
    } else {
      rootFiles.push(file);
    }
  }

  const normalizeNode = (node: CloudFolderTreeNode): CloudFolderTreeNode => ({
    ...node,
    folders: sortByName(node.folders).map(normalizeNode),
    files: sortByName(node.files),
  });

  return {
    projectId,
    folders: sortByName(rootFolders).map(normalizeNode),
    files: sortByName(rootFiles),
  };
}

export async function getProjectTreeForAccess(
  projectId: string,
  userId: string,
): Promise<CloudProjectTree> {
  await requireProjectReadAccess(userId, projectId);

  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        parentId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.file.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        folderId: true,
        name: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  return buildProjectTree(projectId, folders, files);
}

export async function getProjectRunSnapshotForAccess(
  projectId: string,
  userId: string,
): Promise<CloudProjectRunSnapshot> {
  const access = await requireProjectReadAccess(userId, projectId);
  const project = access.project;

  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        parentId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.file.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        folderId: true,
        name: true,
        content: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const resolveFolderPath = createFolderPathResolver(
    folders,
    "Папка проекта не найдена при подготовке snapshot",
  );

  return {
    projectId: project.id,
    projectName: project.name,
    folders: folders.map((folder) => ({
      ...folder,
      relativePath: resolveFolderPath(folder.id),
    })),
    files: files.map((file) => ({
      ...file,
      relativePath: joinRelativePath(
        file.folderId ? resolveFolderPath(file.folderId) : null,
        file.name,
      ),
    })),
  };
}

export async function getProjectSyncManifestForAccess(
  projectId: string,
  userId: string,
  targetRelativePath: string | null = null,
): Promise<CloudProjectSyncManifest> {
  const access = await requireProjectReadAccess(userId, projectId);
  const project = access.project;

  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        parentId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.file.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        folderId: true,
        name: true,
        content: true,
        version: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const resolveFolderPath = createFolderPathResolver(
    folders,
    "Папка проекта не найдена при подготовке manifest.",
  );

  const manifestFolders = folders
    .map((folder) => ({
      ...folder,
      relativePath: resolveFolderPath(folder.id),
    }))
    .filter((folder) =>
      includesTargetRelativePath(folder.relativePath, targetRelativePath, "folder"),
    );

  const manifestFiles = files
    .map((file) => ({
      id: file.id,
      projectId: file.projectId,
      folderId: file.folderId,
      name: file.name,
      version: file.version,
      updatedAt: file.updatedAt,
      relativePath: joinRelativePath(
        file.folderId ? resolveFolderPath(file.folderId) : null,
        file.name,
      ),
      contentHash: hashFileContent(file.content),
      contentSize: Buffer.byteLength(file.content, "utf-8"),
    }))
    .filter((file) =>
      includesTargetRelativePath(file.relativePath, targetRelativePath, "file"),
    );

  return {
    projectId: project.id,
    projectName: project.name,
    folders: manifestFolders,
    files: manifestFiles,
  };
}
