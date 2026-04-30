import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import {
  findSiblingFile,
  moveProjectFileForAccess,
} from "../lib/cloudExplorer.js";
import {
  assertFolderInProject,
  getProjectFileForAccess,
  requireProjectReadAccess,
  requireProjectWriteAccess,
} from "../lib/projectAccess.js";
import { prisma } from "../lib/prisma.js";
import { requireUserId } from "../lib/requestContext.js";
import type {
  CreateFileBody,
  MoveFileBody,
  ProjectFileParams,
  ProjectFilesParams,
  UpdateFileBody,
} from "../lib/validation.js";

export async function getProjectFiles(req: Request, res: Response) {
  const { projectId } = req.params as ProjectFilesParams;
  const userId = requireUserId(req, "UNAUTHORIZED");

  await requireProjectReadAccess(userId, projectId);

  const files = await prisma.file.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "asc" }],
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

  res.json({ files });
}

export async function createFile(req: Request, res: Response) {
  const { projectId } = req.params as ProjectFilesParams;
  const { name, content, folderId } = req.body as CreateFileBody;
  const userId = requireUserId(req, "UNAUTHORIZED");

  await requireProjectWriteAccess(userId, projectId);
  await assertFolderInProject(userId, projectId, folderId ?? null, "write");

  const existingFile = await findSiblingFile(projectId, folderId ?? null, name);

  if (existingFile) {
    throw new AppError("Файл с таким именем уже существует", 409, undefined, "CONFLICT");
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
  const userId = requireUserId(req, "UNAUTHORIZED");
  const file = await getProjectFileForAccess(userId, projectId, id);
  const access = await requireProjectReadAccess(userId, projectId);

  res.json({
    file: {
      ...file,
      canWrite: access.role !== "viewer",
    },
  });
}

export async function updateProjectFile(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFileParams;
  const { name, content, expectedVersion } = req.body as UpdateFileBody;
  const userId = requireUserId(req, "UNAUTHORIZED");

  const file = await getProjectFileForAccess(userId, projectId, id, "write");

  if (name && name !== file.name) {
    const duplicate = await findSiblingFile(projectId, file.folderId ?? null, name);

    if (duplicate && duplicate.id !== file.id) {
      throw new AppError("Файл с таким именем уже существует", 409, undefined, "CONFLICT");
    }
  }

  if (expectedVersion !== undefined && expectedVersion !== file.version) {
    throw new AppError(
      "Версия облачного файла устарела. Пересчитайте изменения и повторите попытку.",
      409,
      undefined,
      "CONFLICT",
    );
  }

  const updatedFile =
    expectedVersion === undefined
      ? await prisma.file.update({
          where: { id: file.id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(content !== undefined ? { content } : {}),
            ...(content !== undefined ? { version: { increment: 1 } } : {}),
          },
        })
      : await prisma.$transaction(async (tx) => {
          const updateResult = await tx.file.updateMany({
            where: {
              id: file.id,
              version: expectedVersion,
            },
            data: {
              ...(name !== undefined ? { name } : {}),
              ...(content !== undefined ? { content } : {}),
              ...(content !== undefined ? { version: { increment: 1 } } : {}),
            },
          });

          if (updateResult.count !== 1) {
            throw new AppError(
              "Версия облачного файла устарела. Пересчитайте изменения и повторите попытку.",
              409,
              undefined,
              "CONFLICT",
            );
          }

          return tx.file.findUniqueOrThrow({
            where: { id: file.id },
          });
        });

  res.json({
    file: {
      ...updatedFile,
      canWrite: true,
    },
  });
}

export async function deleteProjectFile(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFileParams;
  const userId = requireUserId(req, "UNAUTHORIZED");
  const file = await getProjectFileForAccess(userId, projectId, id, "write");

  await prisma.file.delete({
    where: { id: file.id },
  });

  res.status(204).send();
}

export async function moveProjectFile(req: Request, res: Response) {
  const { projectId, id } = req.params as ProjectFileParams;
  const { targetProjectId, targetFolderId } = req.body as MoveFileBody;
  const userId = requireUserId(req, "UNAUTHORIZED");
  const result = await moveProjectFileForAccess(
    userId,
    projectId,
    id,
    targetProjectId,
    targetFolderId ?? null,
  );

  res.json(result);
}
