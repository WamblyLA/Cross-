import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import {
  getProjectRunSnapshotForAccess,
  getProjectTreeForAccess,
} from "../lib/cloudExplorer.js";
import {
  projectAccessToSummary,
  requireProjectOwnerAccess,
  requireProjectReadAccess,
} from "../lib/projectAccess.js";
import { prisma } from "../lib/prisma.js";
import type {
  CreateProjectBody,
  ProjectParams,
  UpdateProjectBody,
} from "../lib/validation.js";

function requireUserId(req: Request) {
  if (!req.userId) {
    throw new AppError("Требуется авторизация", 401, undefined, "UNAUTHORIZED");
  }

  return req.userId;
}

export async function getProjects(req: Request, res: Response) {
  const userId = requireUserId(req);

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      members: {
        where: { userId },
        select: {
          id: true,
          role: true,
        },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  res.json({
    projects: projects.map((project) => ({
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      accessRole:
        project.ownerId === userId
          ? "owner"
          : project.members[0]?.role === "EDITOR"
            ? "editor"
            : "viewer",
      isOwner: project.ownerId === userId,
    })),
  });
}

export async function createProject(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { name } = req.body as CreateProjectBody;

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name,
    },
  });

  res.status(201).json({
    project: {
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      accessRole: "owner",
      isOwner: true,
    },
  });
}

export async function getProject(req: Request, res: Response) {
  const { id } = req.params as ProjectParams;
  const userId = requireUserId(req);
  const project = await requireProjectReadAccess(userId, id);

  res.json({ project: projectAccessToSummary(project) });
}

export async function getProjectTree(req: Request, res: Response) {
  const { id } = req.params as ProjectParams;
  const userId = requireUserId(req);
  const tree = await getProjectTreeForAccess(id, userId);

  res.json({ tree });
}

export async function getProjectRunSnapshot(req: Request, res: Response) {
  const { id } = req.params as ProjectParams;
  const userId = requireUserId(req);
  const snapshot = await getProjectRunSnapshotForAccess(id, userId);

  res.json({ snapshot });
}

export async function updateProject(req: Request, res: Response) {
  const { id } = req.params as ProjectParams;
  const { name } = req.body as UpdateProjectBody;
  const userId = requireUserId(req);
  const projectAccess = await requireProjectOwnerAccess(userId, id);

  const updatedProject = await prisma.project.update({
    where: { id: projectAccess.project.id },
    data: { name },
  });

  res.json({
    project: {
      id: updatedProject.id,
      ownerId: updatedProject.ownerId,
      name: updatedProject.name,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt,
      accessRole: "owner",
      isOwner: true,
    },
  });
}

export async function deleteProject(req: Request, res: Response) {
  const { id } = req.params as ProjectParams;
  const userId = requireUserId(req);
  const projectAccess = await requireProjectOwnerAccess(userId, id);

  await prisma.project.delete({
    where: { id: projectAccess.project.id },
  });

  res.status(204).send();
}
