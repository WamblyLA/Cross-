import type {
  Prisma,
  ProjectInvitation,
  ProjectInvitationStatus,
  ProjectMemberRole,
} from "../../generated/prisma/index.js";
import { AppError } from "./errors.js";
import { requireProjectOwnerAccess, requireProjectReadAccess } from "./projectAccess.js";
import { prisma } from "./prisma.js";

export type PendingProjectInvitationSummary = {
  id: string;
  inviteeUserId: string;
  username: string;
  email: string;
  role: "editor" | "viewer";
  status: "pending";
  createdAt: string;
  updatedAt: string;
};

function toRole(role: ProjectMemberRole): "editor" | "viewer" {
  return role === "EDITOR" ? "editor" : "viewer";
}

function toPendingStatus(status: ProjectInvitationStatus): "pending" {
  if (status !== "PENDING") {
    throw new Error("Unexpected non-pending invitation status in pending invitation mapper");
  }

  return "pending";
}

function toPendingInvitationSummary(
  invitation: ProjectInvitation & {
    invitee: {
      username: string;
      email: string;
    };
  },
): PendingProjectInvitationSummary {
  return {
    id: invitation.id,
    inviteeUserId: invitation.inviteeUserId,
    username: invitation.invitee.username,
    email: invitation.invitee.email,
    role: toRole(invitation.role),
    status: toPendingStatus(invitation.status),
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
  };
}

function createInvitationNotFoundError() {
  return new AppError("Приглашение не найдено", 404, undefined, "INVITATION_NOT_FOUND");
}

function createInvitationNotPendingError() {
  return new AppError(
    "Приглашение больше не ожидает ответа",
    409,
    undefined,
    "INVITATION_NOT_PENDING",
  );
}

async function archiveInvitationNotification(
  transaction: Prisma.TransactionClient,
  invitationId: string,
  timestamp: Date,
) {
  await transaction.notification.updateMany({
    where: {
      projectInvitationId: invitationId,
      archivedAt: null,
    },
    data: {
      archivedAt: timestamp,
      readAt: timestamp,
    },
  });
}

export async function listPendingProjectInvitationsForOwnerView(
  userId: string,
  projectId: string,
): Promise<PendingProjectInvitationSummary[]> {
  const access = await requireProjectReadAccess(userId, projectId);

  if (!access.isOwner) {
    return [];
  }

  const invitations = await prisma.projectInvitation.findMany({
    where: {
      projectId,
      status: "PENDING",
    },
    include: {
      invitee: {
        select: {
          username: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return invitations.map(toPendingInvitationSummary);
}

export async function createProjectInvitation(input: {
  userId: string;
  projectId: string;
  email: string;
  role: "editor" | "viewer";
}): Promise<PendingProjectInvitationSummary> {
  const access = await requireProjectOwnerAccess(input.userId, input.projectId);
  const targetUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  if (!targetUser) {
    throw new AppError("Пользователь не найден", 404, undefined, "USER_NOT_FOUND");
  }

  if (targetUser.id === access.project.ownerId) {
    throw new AppError("Пользователь уже добавлен", 409, undefined, "ALREADY_MEMBER");
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: input.projectId,
        userId: targetUser.id,
      },
    },
    select: { id: true },
  });

  if (existingMember) {
    throw new AppError("Пользователь уже добавлен", 409, undefined, "ALREADY_MEMBER");
  }

  const nextRole = input.role === "editor" ? "EDITOR" : "VIEWER";
  const invitation = await prisma.$transaction(async (tx) => {
    const existingInvitation = await tx.projectInvitation.findUnique({
      where: {
        projectId_inviteeUserId: {
          projectId: input.projectId,
          inviteeUserId: targetUser.id,
        },
      },
      include: {
        invitee: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });

    if (existingInvitation?.status === "PENDING") {
      throw new AppError("Пользователь уже приглашён", 409, undefined, "ALREADY_INVITED");
    }

    const upsertedInvitation = existingInvitation
      ? await tx.projectInvitation.update({
          where: { id: existingInvitation.id },
          data: {
            inviterUserId: input.userId,
            role: nextRole,
            status: "PENDING",
            respondedAt: null,
          },
          include: {
            invitee: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        })
      : await tx.projectInvitation.create({
          data: {
            projectId: input.projectId,
            inviterUserId: input.userId,
            inviteeUserId: targetUser.id,
            role: nextRole,
            status: "PENDING",
          },
          include: {
            invitee: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        });

    await tx.notification.upsert({
      where: {
        projectInvitationId: upsertedInvitation.id,
      },
      update: {
        userId: targetUser.id,
        type: "PROJECT_INVITATION",
        archivedAt: null,
        readAt: null,
      },
      create: {
        userId: targetUser.id,
        type: "PROJECT_INVITATION",
        projectInvitationId: upsertedInvitation.id,
      },
    });

    return upsertedInvitation;
  });

  return toPendingInvitationSummary(invitation);
}

export async function revokeProjectInvitation(input: {
  userId: string;
  projectId: string;
  invitationId: string;
}) {
  await requireProjectOwnerAccess(input.userId, input.projectId);

  await prisma.$transaction(async (tx) => {
    const invitation = await tx.projectInvitation.findFirst({
      where: {
        id: input.invitationId,
        projectId: input.projectId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!invitation) {
      throw createInvitationNotFoundError();
    }

    if (invitation.status !== "PENDING") {
      throw createInvitationNotPendingError();
    }

    const now = new Date();

    await tx.projectInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "REVOKED",
        respondedAt: now,
      },
    });

    await archiveInvitationNotification(tx, invitation.id, now);
  });
}

export async function acceptProjectInvitation(userId: string, invitationId: string) {
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.projectInvitation.findFirst({
      where: {
        id: invitationId,
        inviteeUserId: userId,
      },
      include: {
        project: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!invitation) {
      throw createInvitationNotFoundError();
    }

    if (invitation.status !== "PENDING") {
      throw createInvitationNotPendingError();
    }

    if (invitation.project.ownerId !== userId) {
      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId,
          },
        },
        update: {},
        create: {
          projectId: invitation.projectId,
          userId,
          role: invitation.role,
        },
      });
    }

    const now = new Date();

    await tx.projectInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        respondedAt: now,
      },
    });

    await archiveInvitationNotification(tx, invitation.id, now);

    return {
      invitationId: invitation.id,
      projectId: invitation.projectId,
    };
  });
}

export async function declineProjectInvitation(userId: string, invitationId: string) {
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.projectInvitation.findFirst({
      where: {
        id: invitationId,
        inviteeUserId: userId,
      },
      select: {
        id: true,
        projectId: true,
        status: true,
      },
    });

    if (!invitation) {
      throw createInvitationNotFoundError();
    }

    if (invitation.status !== "PENDING") {
      throw createInvitationNotPendingError();
    }

    const now = new Date();

    await tx.projectInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "DECLINED",
        respondedAt: now,
      },
    });

    await archiveInvitationNotification(tx, invitation.id, now);

    return {
      invitationId: invitation.id,
      projectId: invitation.projectId,
    };
  });
}
