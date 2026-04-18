import { createHash } from "node:crypto";
import type { File, Folder } from "../../generated/prisma/index.js";
import { AppError } from "./errors.js";
import {
  assertFolderInProject,
  getProjectFileForAccess,
  getProjectFolderForAccess,
  projectAccessToSummary,
  requireProjectReadAccess,
  requireProjectWriteAccess,
} from "./projectAccess.js";
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

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, "ru"));
}

export async function findSiblingFolder(projectId: string, parentId: string | null, name: string) {
  return prisma.folder.findFirst({
    where: {
      projectId,
      parentId,
      name,
    },
    select: {
      id: true,
    },
  });
}

export async function findSiblingFile(projectId: string, folderId: string | null, name: string) {
  return prisma.file.findFirst({
    where: {
      projectId,
      folderId,
      name,
    },
    select: {
      id: true,
    },
  });
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

  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const folderPathCache = new Map<string, string>();

  const resolveFolderPath = (folderId: string): string => {
    const cachedPath = folderPathCache.get(folderId);

    if (cachedPath) {
      return cachedPath;
    }

    const folder = folderById.get(folderId);

    if (!folder) {
      throw new AppError("Папка проекта не найдена при подготовке snapshot", 500);
    }

    const relativePath = joinRelativePath(
      folder.parentId ? resolveFolderPath(folder.parentId) : null,
      folder.name,
    );

    folderPathCache.set(folderId, relativePath);

    return relativePath;
  };

  const snapshotFolders = folders.map((folder) => ({
    ...folder,
    relativePath: resolveFolderPath(folder.id),
  }));

  const snapshotFiles = files.map((file) => ({
    ...file,
    relativePath: joinRelativePath(file.folderId ? resolveFolderPath(file.folderId) : null, file.name),
  }));

  return {
    projectId: project.id,
    projectName: project.name,
    folders: snapshotFolders,
    files: snapshotFiles,
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

  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const folderPathCache = new Map<string, string>();

  const resolveFolderPath = (folderId: string): string => {
    const cachedPath = folderPathCache.get(folderId);

    if (cachedPath) {
      return cachedPath;
    }

    const folder = folderById.get(folderId);

    if (!folder) {
      throw new AppError("Папка проекта не найдена при подготовке manifest.", 500);
    }

    const relativePath = joinRelativePath(
      folder.parentId ? resolveFolderPath(folder.parentId) : null,
      folder.name,
    );

    folderPathCache.set(folderId, relativePath);

    return relativePath;
  };

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

export async function collectFolderDescendants(projectId: string, folderId: string) {
  const folders = await prisma.folder.findMany({
    where: { projectId },
    select: {
      id: true,
      parentId: true,
    },
  });

  const childrenByParent = new Map<string | null, string[]>();

  for (const folder of folders) {
    const siblings = childrenByParent.get(folder.parentId) ?? [];
    siblings.push(folder.id);
    childrenByParent.set(folder.parentId, siblings);
  }

  const collected: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId) {
      continue;
    }

    collected.push(currentId);

    for (const childId of childrenByParent.get(currentId) ?? []) {
      queue.push(childId);
    }
  }

  return collected;
}

export async function listDeletedFolderFileIds(projectId: string, folderId: string) {
  const descendantIds = await collectFolderDescendants(projectId, folderId);

  const files = await prisma.file.findMany({
    where: {
      projectId,
      folderId: {
        in: descendantIds,
      },
    },
    select: {
      id: true,
    },
  });

  return files.map((file) => file.id);
}

export async function moveProjectFileForAccess(
  userId: string,
  sourceProjectId: string,
  fileId: string,
  targetProjectId: string,
  targetFolderId: string | null,
) {
  const file = await getProjectFileForAccess(userId, sourceProjectId, fileId, "write");

  await requireProjectWriteAccess(userId, targetProjectId);
  await assertFolderInProject(userId, targetProjectId, targetFolderId, "write");

  if (file.projectId === targetProjectId && (file.folderId ?? null) === targetFolderId) {
    throw new AppError("Файл уже находится в выбранной папке", 409);
  }

  const duplicate = await findSiblingFile(targetProjectId, targetFolderId, file.name);

  if (duplicate && duplicate.id !== file.id) {
    throw new AppError("Файл с таким именем уже существует в выбранной папке", 409);
  }

  const updatedFile = await prisma.file.update({
    where: { id: file.id },
    data: {
      projectId: targetProjectId,
      folderId: targetFolderId,
    },
  });

  return {
    file: updatedFile,
    sourceProjectId: file.projectId,
    targetProjectId,
  };
}

export async function moveProjectFolderForAccess(
  userId: string,
  sourceProjectId: string,
  folderId: string,
  targetProjectId: string,
  targetParentId: string | null,
) {
  const folder = await getProjectFolderForAccess(userId, sourceProjectId, folderId, "write");

  await requireProjectWriteAccess(userId, targetProjectId);
  await assertFolderInProject(userId, targetProjectId, targetParentId, "write");

  if (folder.projectId === targetProjectId && (folder.parentId ?? null) === targetParentId) {
    throw new AppError("Папка уже находится в выбранном месте", 409);
  }

  const descendantIds = await collectFolderDescendants(folder.projectId, folder.id);

  if (targetParentId && descendantIds.includes(targetParentId)) {
    throw new AppError("Нельзя переместить папку внутрь самой себя или её дочерней папки", 409);
  }

  const duplicate = await findSiblingFolder(targetProjectId, targetParentId, folder.name);

  if (duplicate && duplicate.id !== folder.id) {
    throw new AppError("Папка с таким именем уже существует в выбранном месте", 409);
  }

  const nestedFolderIds = descendantIds.filter((id) => id !== folder.id);

  const result = await prisma.$transaction(async (transaction) => {
    const updatedFolder = await transaction.folder.update({
      where: { id: folder.id },
      data: {
        projectId: targetProjectId,
        parentId: targetParentId,
      },
      select: {
        id: true,
        projectId: true,
        parentId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (nestedFolderIds.length > 0) {
      await transaction.folder.updateMany({
        where: {
          id: {
            in: nestedFolderIds,
          },
        },
        data: {
          projectId: targetProjectId,
        },
      });
    }

    await transaction.file.updateMany({
      where: {
        folderId: {
          in: descendantIds,
        },
      },
      data: {
        projectId: targetProjectId,
      },
    });

    const movedFiles = await transaction.file.findMany({
      where: {
        folderId: {
          in: descendantIds,
        },
      },
      select: {
        id: true,
        projectId: true,
        folderId: true,
        name: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      folder: updatedFolder,
      movedFiles,
    };
  });

  return {
    folder: result.folder,
    sourceProjectId: folder.projectId,
    targetProjectId,
    movedFiles: result.movedFiles,
  };
}

export function projectAccessToProjectSummary(projectAccess: Awaited<ReturnType<typeof requireProjectReadAccess>>) {
  return projectAccessToSummary(projectAccess);
}
