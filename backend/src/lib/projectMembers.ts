import type { ProjectMember, ProjectMemberRole } from "../../generated/prisma/index.js";
import { AppError } from "./errors.js";
import { requireProjectOwnerAccess, requireProjectReadAccess } from "./projectAccess.js";
import { prisma } from "./prisma.js";

export type ProjectMemberSummary = {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

function toMemberRole(role: ProjectMemberRole): "editor" | "viewer" {
  return role === "EDITOR" ? "editor" : "viewer";
}

function toSummary(member: ProjectMember & { user: { username: string; email: string } }): ProjectMemberSummary {
  return {
    id: member.id,
    userId: member.userId,
    username: member.user.username,
    email: member.user.email,
    role: toMemberRole(member.role),
    isOwner: false,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function createOwnerSummary(project: {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    username: string;
    email: string;
  };
}): ProjectMemberSummary {
  return {
    id: project.owner.id,
    userId: project.owner.id,
    username: project.owner.username,
    email: project.owner.email,
    role: "owner",
    isOwner: true,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function listProjectMembers(userId: string, projectId: string): Promise<ProjectMemberSummary[]> {
  await requireProjectReadAccess(userId, projectId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              username: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  if (!project) {
    throw new AppError("Проект не найден", 404, undefined, "PROJECT_NOT_FOUND");
  }

  return [createOwnerSummary(project), ...project.members.map(toSummary)];
}

export async function addProjectMember(input: {
  userId: string;
  projectId: string;
  email: string;
  role: "editor" | "viewer";
}): Promise<ProjectMemberSummary> {
  const access = await requireProjectOwnerAccess(input.userId, input.projectId);
  const targetUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (!targetUser) {
    throw new AppError("Пользователь не найден", 404, undefined, "USER_NOT_FOUND");
  }

  if (targetUser.id === access.project.ownerId) {
    throw new AppError("Пользователь уже добавлен", 409, undefined, "ALREADY_MEMBER");
  }

  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId: input.projectId,
      userId: targetUser.id,
    },
    select: {
      id: true,
    },
  });

  if (existingMember) {
    throw new AppError("Пользователь уже добавлен", 409, undefined, "ALREADY_MEMBER");
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId: input.projectId,
      userId: targetUser.id,
      role: input.role === "editor" ? "EDITOR" : "VIEWER",
    },
    include: {
      user: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });

  return toSummary(member);
}

export async function updateProjectMemberRole(input: {
  userId: string;
  projectId: string;
  memberId: string;
  role: "editor" | "viewer";
}): Promise<ProjectMemberSummary> {
  const access = await requireProjectOwnerAccess(input.userId, input.projectId);

  if (input.memberId === access.project.ownerId) {
    throw new AppError("Нельзя изменить роль владельца проекта", 409, undefined, "OWNER_CANNOT_BE_REMOVED");
  }

  const member = await prisma.projectMember.findFirst({
    where: {
      id: input.memberId,
      projectId: input.projectId,
    },
    include: {
      user: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });

  if (!member) {
    throw new AppError("Участник проекта не найден", 404, undefined, "MEMBER_NOT_FOUND");
  }

  const updatedMember = await prisma.projectMember.update({
    where: {
      id: member.id,
    },
    data: {
      role: input.role === "editor" ? "EDITOR" : "VIEWER",
    },
    include: {
      user: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });

  return toSummary(updatedMember);
}

export async function removeProjectMember(input: {
  userId: string;
  projectId: string;
  memberId: string;
}) {
  const access = await requireProjectOwnerAccess(input.userId, input.projectId);

  if (input.memberId === access.project.ownerId) {
    throw new AppError("Нельзя удалить владельца проекта", 409, undefined, "OWNER_CANNOT_BE_REMOVED");
  }

  const member = await prisma.projectMember.findFirst({
    where: {
      id: input.memberId,
      projectId: input.projectId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!member) {
    throw new AppError("Участник проекта не найден", 404, undefined, "MEMBER_NOT_FOUND");
  }

  await prisma.$transaction([
    prisma.projectLink.deleteMany({
      where: {
        projectId: input.projectId,
        userId: member.userId,
      },
    }),
    prisma.projectMember.delete({
      where: {
        id: member.id,
      },
    }),
  ]);
}
