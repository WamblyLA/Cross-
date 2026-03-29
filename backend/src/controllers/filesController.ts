import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import {
  assertFolderInProject,
  ensureOwnedProject,
  findSiblingFile,
  getOwnedFileOrThrow,
  moveOwnedFile,
} from "../lib/cloudExplorer.js";
import { prisma } from "../lib/prisma.js";
import type {
  CreateFileBody,
  MoveFileBody,
  ProjectFileParams,
  ProjectFilesParams,
  UpdateFileBody,
} from "../lib/validation.js";

export async function getProjectFiles(req: Request, res: Response) {
  const { projectId } = req.params as ProjectFilesParams;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  await ensureOwnedProject(projectId, userId);

  const files = await prisma.file.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      projectId: true,
      folderId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ files });
}

export async function createFile(req: Request, res: Response) {
  const { projectId } = req.params as ProjectFilesParams;
  const { name, content, folderId } = req.body as CreateFileBody;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  await ensureOwnedProject(projectId, userId);
  await assertFolderInProject(userId, projectId, folderId ?? null);

  const existingFile = await findSiblingFile(projectId, folderId ?? null, name);

  if (existingFile) {
    throw new AppError("Файл с таким именем уже существует", 409);
  }

  const file = await prisma.file.create({
    data: {
      projectId,
      folderId: folderId ?? null,
      name,
      content,
    },
  });

  res.status(201).json({ file });
}

export async function getProjectFile(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFileParams;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const file = await getOwnedFileOrThrow(userId, projectId, id);

  res.json({ file });
}

export async function updateProjectFile(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFileParams;
  const { name, content } = req.body as UpdateFileBody;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const file = await getOwnedFileOrThrow(userId, projectId, id);

  if (name && name !== file.name) {
    const duplicate = await findSiblingFile(projectId, file.folderId ?? null, name);

    if (duplicate && duplicate.id !== file.id) {
      throw new AppError("Файл с таким именем уже существует", 409);
    }
  }

  const updatedFile = await prisma.file.update({
    where: { id: file.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(content !== undefined ? { content } : {}),
    },
  });

  res.json({ file: updatedFile });
}

export async function deleteProjectFile(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFileParams;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const file = await getOwnedFileOrThrow(userId, projectId, id);

  await prisma.file.delete({
    where: { id: file.id },
  });

  res.status(204).send();
}

export async function moveProjectFile(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFileParams;
  const { targetProjectId, targetFolderId } = req.body as MoveFileBody;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const result = await moveOwnedFile(userId, projectId, id, targetProjectId, targetFolderId ?? null);

  res.json(result);
}
