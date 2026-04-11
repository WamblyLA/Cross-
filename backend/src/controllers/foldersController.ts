import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import {
  findSiblingFolder,
  listDeletedFolderFileIds,
  moveProjectFolderForAccess,
} from "../lib/cloudExplorer.js";
import {
  assertFolderInProject,
  getProjectFolderForAccess,
  requireProjectWriteAccess,
} from "../lib/projectAccess.js";
import { prisma } from "../lib/prisma.js";
import type {
  CreateFolderBody,
  MoveFolderBody,
  ProjectFilesParams,
  ProjectFolderParams,
  UpdateFolderBody,
} from "../lib/validation.js";

function requireUserId(req: Request) {
  if (!req.userId) {
    throw new AppError("Требуется авторизация", 401, undefined, "UNAUTHORIZED");
  }

  return req.userId;
}

export async function createFolder(req: Request, res: Response) {
  const { projectId } = req.params as ProjectFilesParams;
  const { name, parentId } = req.body as CreateFolderBody;
  const userId = requireUserId(req);

  await requireProjectWriteAccess(userId, projectId);
  await assertFolderInProject(userId, projectId, parentId ?? null, "write");

  const duplicate = await findSiblingFolder(projectId, parentId ?? null, name);

  if (duplicate) {
    throw new AppError("Папка с таким именем уже существует", 409, undefined, "CONFLICT");
  }

  const folder = await prisma.folder.create({
    data: {
      projectId,
      parentId: parentId ?? null,
      name,
    },
  });

  res.status(201).json({ folder });
}

export async function updateFolder(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFolderParams;
  const { name } = req.body as UpdateFolderBody;
  const userId = requireUserId(req);
  const folder = await getProjectFolderForAccess(userId, projectId, id, "write");
  const duplicate = await findSiblingFolder(projectId, folder.parentId ?? null, name);

  if (duplicate && duplicate.id !== folder.id) {
    throw new AppError("Папка с таким именем уже существует", 409, undefined, "CONFLICT");
  }

  const updatedFolder = await prisma.folder.update({
    where: { id: folder.id },
    data: { name },
  });

  res.json({ folder: updatedFolder });
}

export async function deleteFolder(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFolderParams;
  const userId = requireUserId(req);
  const folder = await getProjectFolderForAccess(userId, projectId, id, "write");
  const deletedFileIds = await listDeletedFolderFileIds(projectId, folder.id);

  await prisma.folder.delete({
    where: { id: folder.id },
  });

  res.json({
    folderId: folder.id,
    deletedFileIds,
  });
}

export async function moveFolder(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFolderParams;
  const { targetProjectId, targetParentId } = req.body as MoveFolderBody;
  const userId = requireUserId(req);
  const result = await moveProjectFolderForAccess(
    userId,
    projectId,
    id,
    targetProjectId,
    targetParentId ?? null,
  );

  res.json(result);
}
