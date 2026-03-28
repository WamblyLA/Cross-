import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type {
  CreateProjectBody,
  ProjectParams,
  UpdateProjectBody,
} from "../lib/validation.js";

async function getOwnedProjectOrThrow(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
  });

  if (!project) {
    throw new AppError("Проект не найден", 404);
  }

  return project;
}

export async function getProjects(req: Request, res: Response) {
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  res.json({ projects });
}

export async function createProject(req: Request, res: Response) {
  const userId = req.userId;
  const { name } = req.body as CreateProjectBody;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name,
    },
  });

  res.status(201).json({ project });
}

export async function getProject(req: Request, res: Response) {
  const { id } = req.params as ProjectParams;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const project = await getOwnedProjectOrThrow(id, userId);

  res.json({ project });
}

export async function updateProject(req: Request, res: Response) {
  const { id } = req.params as ProjectParams;
  const { name } = req.body as UpdateProjectBody;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const project = await getOwnedProjectOrThrow(id, userId);

  const updatedProject = await prisma.project.update({
    where: { id: project.id },
    data: { name },
  });

  res.json({ project: updatedProject });
}

export async function deleteProject(req: Request, res: Response) {
  const { id } = req.params as ProjectParams;
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const project = await getOwnedProjectOrThrow(id, userId);

  await prisma.project.delete({
    where: { id: project.id },
  });

  res.status(204).send();
}
