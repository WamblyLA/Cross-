import { AppError } from "./errors.js";
import { prisma } from "./prisma.js";

export type ProjectLinkSummary = {
  id: string;
  projectId: string;
  projectName: string;
  clientBindingKey: string;
  localRootLabel: string;
  lastSyncAt: string | null;
  lastSyncDirection: "push" | "pull" | null;
  createdAt: string;
  updatedAt: string;
};

function toProjectLinkSummary(link: {
  id: string;
  projectId: string;
  clientBindingKey: string;
  localRootLabel: string;
  lastSyncAt: Date | null;
  lastSyncDirection: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: {
    name: string;
  };
}): ProjectLinkSummary {
  return {
    id: link.id,
    projectId: link.projectId,
    projectName: link.project.name,
    clientBindingKey: link.clientBindingKey,
    localRootLabel: link.localRootLabel,
    lastSyncAt: link.lastSyncAt?.toISOString() ?? null,
    lastSyncDirection:
      link.lastSyncDirection === "push" || link.lastSyncDirection === "pull"
        ? link.lastSyncDirection
        : null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

export async function listProjectLinks(userId: string): Promise<ProjectLinkSummary[]> {
  const links = await prisma.projectLink.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return links.map(toProjectLinkSummary);
}

export async function createProjectLink(input: {
  userId: string;
  projectId: string;
  clientBindingKey: string;
  localRootLabel: string;
}): Promise<ProjectLinkSummary> {
  const ownedProject = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      ownerId: input.userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!ownedProject) {
    throw new AppError("Проект не найден", 404);
  }

  const existing = await prisma.projectLink.findFirst({
    where: {
      userId: input.userId,
      clientBindingKey: input.clientBindingKey,
    },
    include: {
      project: {
        select: {
          name: true,
        },
      },
    },
  });

  if (existing && existing.projectId !== input.projectId) {
    throw new AppError("Этот локальный ключ связи уже привязан к другому облачному проекту", 409);
  }

  const link = existing
    ? await prisma.projectLink.update({
        where: { id: existing.id },
        data: {
          localRootLabel: input.localRootLabel,
        },
        include: {
          project: {
            select: {
              name: true,
            },
          },
        },
      })
    : await prisma.projectLink.create({
        data: {
          userId: input.userId,
          projectId: input.projectId,
          clientBindingKey: input.clientBindingKey,
          localRootLabel: input.localRootLabel,
        },
        include: {
          project: {
            select: {
              name: true,
            },
          },
        },
      });

  return toProjectLinkSummary(link);
}

export async function deleteProjectLink(userId: string, linkId: string) {
  const link = await prisma.projectLink.findFirst({
    where: {
      id: linkId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!link) {
    throw new AppError("Связь не найдена", 404);
  }

  await prisma.projectLink.delete({
    where: { id: link.id },
  });
}

export async function updateProjectLinkSyncSummary(input: {
  userId: string;
  linkId: string;
  lastSyncAt?: string;
  lastSyncDirection?: "push" | "pull";
}): Promise<ProjectLinkSummary> {
  const link = await prisma.projectLink.findFirst({
    where: {
      id: input.linkId,
      userId: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (!link) {
    throw new AppError("Связь не найдена", 404);
  }

  const updated = await prisma.projectLink.update({
    where: { id: link.id },
    data: {
      ...(input.lastSyncAt !== undefined ? { lastSyncAt: new Date(input.lastSyncAt) } : {}),
      ...(input.lastSyncDirection !== undefined
        ? { lastSyncDirection: input.lastSyncDirection }
        : {}),
    },
    include: {
      project: {
        select: {
          name: true,
        },
      },
    },
  });

  return toProjectLinkSummary(updated);
}
