import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type {
  CreateFileBody,
  ProjectFileParams,
  ProjectFilesParams,
  UpdateFileBody,
} from "../lib/validation.js";

async function ensureOwnedProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new AppError("Проект не найден", 404);
  }
}

async function getOwnedFileOrThrow(userId: string, projectId: string, fileId: string) {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      projectId,
      project: {
        ownerId: userId,
      },
    },
  });

  if (!file) {
    throw new AppError("Файл не найден", 404);
  }

  return file;
}

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
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ files });
}

export async function createFile(req: Request, res: Response) {
  const { projectId } = req.params as ProjectFilesParams;
  const { name, content } = req.body as CreateFileBody;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  await ensureOwnedProject(projectId, userId);

  const existingFile = await prisma.file.findUnique({
    where: {
      projectId_name: {
        projectId,
        name,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingFile) {
    throw new AppError("Файл с таким именем уже существует", 409);
  }

  const file = await prisma.file.create({
    data: {
      projectId,
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
    const duplicate = await prisma.file.findUnique({
      where: {
        projectId_name: {
          projectId,
          name,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
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
