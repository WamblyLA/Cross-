import { AppError } from "./errors.js";
import {
  assertFolderInProject,
  getProjectFileForAccess,
  getProjectFolderForAccess,
  requireProjectWriteAccess,
} from "./projectAccess.js";
import { prisma } from "./prisma.js";

export async function findSiblingFolder(
  projectId: string,
  parentId: string | null,
  name: string,
) {
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

export async function findSiblingFile(
  projectId: string,
  folderId: string | null,
  name: string,
) {
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
