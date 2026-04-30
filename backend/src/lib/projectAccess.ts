import type {
  File,
  Folder,
  Project,
  ProjectMemberRole,
} from "../../generated/prisma/index.js";
import { AppError } from "./errors.js";
import { prisma } from "./prisma.js";

export type ProjectAccessRole = "owner" | "editor" | "viewer";

type AccessibleProjectRecord = Pick<Project, "id" | "ownerId" | "name" | "createdAt" | "updatedAt"> & {
  members: Array<{
    id: string;
    role: ProjectMemberRole;
  }>;
};

export type ProjectAccess = {
  project: Pick<Project, "id" | "ownerId" | "name" | "createdAt" | "updatedAt">;
  role: ProjectAccessRole;
  isOwner: boolean;
  membershipId: string | null;
};

export type ProjectSummary = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  accessRole: ProjectAccessRole;
  isOwner: boolean;
};

function toAccessRole(role: ProjectMemberRole): Exclude<ProjectAccessRole, "owner"> {
  return role === "EDITOR" ? "editor" : "viewer";
}

function toProjectAccess(project: AccessibleProjectRecord, userId: string): ProjectAccess {
  if (project.ownerId === userId) {
    return {
      project,
      role: "owner",
      isOwner: true,
      membershipId: null,
    };
  }

  const membership = project.members[0];

  if (!membership) {
    throw new AppError("Проект не найден", 404, undefined, "PROJECT_NOT_FOUND");
  }

  return {
    project,
    role: toAccessRole(membership.role),
    isOwner: false,
    membershipId: membership.id,
  };
}

function createForbiddenError(message: string) {
  return new AppError(message, 403, undefined, "FORBIDDEN");
}

export function projectAccessToSummary(access: ProjectAccess): ProjectSummary {
  return {
    id: access.project.id,
    ownerId: access.project.ownerId,
    name: access.project.name,
    createdAt: access.project.createdAt,
    updatedAt: access.project.updatedAt,
    accessRole: access.role,
    isOwner: access.isOwner,
  };
}

export async function getProjectAccess(
  userId: string,
  projectId: string,
): Promise<ProjectAccess | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
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
  });

  if (!project) {
    return null;
  }

  return toProjectAccess(project, userId);
}

export async function requireProjectReadAccess(userId: string, projectId: string) {
  const access = await getProjectAccess(userId, projectId);

  if (!access) {
    throw new AppError("Проект не найден", 404, undefined, "PROJECT_NOT_FOUND");
  }

  return access;
}

export async function requireProjectWriteAccess(userId: string, projectId: string) {
  const access = await requireProjectReadAccess(userId, projectId);

  if (access.role === "viewer") {
    throw createForbiddenError("У вас только доступ для чтения этого проекта");
  }

  return access;
}

export async function requireProjectOwnerAccess(userId: string, projectId: string) {
  const access = await requireProjectReadAccess(userId, projectId);

  if (!access.isOwner) {
    throw createForbiddenError("У вас нет прав на управление этим проектом");
  }

  return access;
}

async function findProjectFile(projectId: string, fileId: string) {
  return prisma.file.findFirst({
    where: {
      id: fileId,
      projectId,
    },
  });
}

async function findProjectFolder(projectId: string, folderId: string) {
  return prisma.folder.findFirst({
    where: {
      id: folderId,
      projectId,
    },
  });
}

export async function getProjectFileForAccess(
  userId: string,
  projectId: string,
  fileId: string,
  mode: "read" | "write" = "read",
): Promise<File> {
  if (mode === "write") {
    await requireProjectWriteAccess(userId, projectId);
  } else {
    await requireProjectReadAccess(userId, projectId);
  }

  const file = await findProjectFile(projectId, fileId);

  if (!file) {
    throw new AppError("Файл не найден", 404, undefined, "FILE_NOT_FOUND");
  }

  return file;
}

export async function getProjectFolderForAccess(
  userId: string,
  projectId: string,
  folderId: string,
  mode: "read" | "write" = "read",
): Promise<Folder> {
  if (mode === "write") {
    await requireProjectWriteAccess(userId, projectId);
  } else {
    await requireProjectReadAccess(userId, projectId);
  }

  const folder = await findProjectFolder(projectId, folderId);

  if (!folder) {
    throw new AppError("Папка не найдена", 404, undefined, "FOLDER_NOT_FOUND");
  }

  return folder;
}

export async function assertFolderInProject(
  userId: string,
  projectId: string,
  folderId: string | null,
  mode: "read" | "write" = "read",
) {
  if (!folderId) {
    return null;
  }

  return getProjectFolderForAccess(userId, projectId, folderId, mode);
}
