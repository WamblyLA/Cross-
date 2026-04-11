import type { ProjectMemberRole } from "../../generated/prisma/index.js";
import { prisma } from "./prisma.js";

export type NotificationInvitationSummary = {
  id: string;
  projectId: string;
  projectName: string;
  inviterUserId: string;
  inviterUsername: string;
  inviterEmail: string;
  role: "editor" | "viewer";
  status: "pending";
  createdAt: string;
  updatedAt: string;
};

export type NotificationSummary = {
  id: string;
  type: "PROJECT_INVITATION";
  createdAt: string;
  readAt: string | null;
  invitation: NotificationInvitationSummary;
};

function toRole(role: ProjectMemberRole): "editor" | "viewer" {
  return role === "EDITOR" ? "editor" : "viewer";
}

export async function listNotifications(userId: string): Promise<NotificationSummary[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      archivedAt: null,
      type: "PROJECT_INVITATION",
    },
    include: {
      projectInvitation: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          inviter: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return notifications.flatMap((notification) => {
    const invitation = notification.projectInvitation;

    if (!invitation || invitation.status !== "PENDING") {
      return [];
    }

    return [
      {
        id: notification.id,
        type: "PROJECT_INVITATION" as const,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt?.toISOString() ?? null,
        invitation: {
          id: invitation.id,
          projectId: invitation.projectId,
          projectName: invitation.project.name,
          inviterUserId: invitation.inviter.id,
          inviterUsername: invitation.inviter.username,
          inviterEmail: invitation.inviter.email,
          role: toRole(invitation.role),
          status: "pending" as const,
          createdAt: invitation.createdAt.toISOString(),
          updatedAt: invitation.updatedAt.toISOString(),
        },
      },
    ];
  });
}
