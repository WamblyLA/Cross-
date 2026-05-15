import type { Prisma, ProjectMemberRole } from '../../generated/prisma/index.js';
import { prisma } from './prisma.js';

type NotificationClient = Prisma.TransactionClient;

export type NotificationInvitationSummary = {
  id: string;
  projectId: string;
  projectName: string;
  inviterUserId: string;
  inviterUsername: string;
  inviterEmail: string;
  role: 'editor' | 'viewer';
  status: 'pending';
  createdAt: string;
  updatedAt: string;
};

export type NotificationActivityAction = 'joined_project' | 'deleted_file' | 'deleted_folder';

export type NotificationActivitySummary = {
  projectId: string;
  projectName: string;
  actorUserId: string;
  actorUsername: string;
  actorEmail: string;
  actionType: NotificationActivityAction;
  message: string;
  updatedAt: string;
  fileId: string | null;
  fileName: string | null;
  folderId: string | null;
  folderName: string | null;
  itemPath: string | null;
};

export type NotificationSummary =
  | {
      id: string;
      type: 'PROJECT_INVITATION';
      createdAt: string;
      readAt: string | null;
      invitation: NotificationInvitationSummary;
    }
  | {
      id: string;
      type: 'COLLABORATION_ACTIVITY';
      createdAt: string;
      readAt: string | null;
      activity: NotificationActivitySummary;
    };

type ProjectOwnerActivityPayload = {
  projectId: string;
  projectName: string;
  actorUserId: string;
  actorUsername: string;
  actorEmail: string;
  actionType: NotificationActivityAction;
  itemId: string | null;
  itemName: string | null;
  itemPath: string | null;
  itemType: 'file' | 'folder' | null;
  message: string;
};

type NotifyProjectOwnerAboutActivityInput = {
  projectId: string;
  actorUserId: string;
  actionType: NotificationActivityAction;
  itemId?: string | null;
  itemName?: string | null;
  itemPath?: string | null;
  itemType?: 'file' | 'folder' | null;
};

function toRole(role: ProjectMemberRole): 'editor' | 'viewer' {
  return role === 'EDITOR' ? 'editor' : 'viewer';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNotificationActivityAction(value: unknown): value is NotificationActivityAction {
  return value === 'joined_project' || value === 'deleted_file' || value === 'deleted_folder';
}

function isProjectOwnerActivityPayload(value: unknown): value is ProjectOwnerActivityPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.projectId === 'string' &&
    typeof value.projectName === 'string' &&
    typeof value.actorUserId === 'string' &&
    typeof value.actorUsername === 'string' &&
    typeof value.actorEmail === 'string' &&
    isNotificationActivityAction(value.actionType) &&
    isNullableString(value.itemId) &&
    isNullableString(value.itemName) &&
    isNullableString(value.itemPath) &&
    (value.itemType === 'file' || value.itemType === 'folder' || value.itemType === null) &&
    typeof value.message === 'string'
  );
}

function buildOwnerActivityMessage(input: {
  actorUsername: string;
  projectName: string;
  actionType: NotificationActivityAction;
  itemName: string | null;
}) {
  switch (input.actionType) {
    case 'joined_project':
      return `${input.actorUsername} присоединился к проекту ${input.projectName}.`;
    case 'deleted_file':
      return `${input.actorUsername} удалил файл ${input.itemName ?? 'без названия'} в проекте ${input.projectName}.`;
    case 'deleted_folder':
      return `${input.actorUsername} удалил папку ${input.itemName ?? 'без названия'} в проекте ${input.projectName}.`;
  }
}

function toActivitySummary(notification: {
  id: string;
  createdAt: Date;
  readAt: Date | null;
  updatedAt: Date;
  payload: Prisma.JsonValue | null;
}): NotificationSummary | null {
  if (!isProjectOwnerActivityPayload(notification.payload)) {
    return null;
  }

  const fileId = notification.payload.itemType === 'file' ? notification.payload.itemId : null;
  const fileName = notification.payload.itemType === 'file' ? notification.payload.itemName : null;
  const folderId = notification.payload.itemType === 'folder' ? notification.payload.itemId : null;
  const folderName =
    notification.payload.itemType === 'folder' ? notification.payload.itemName : null;

  return {
    id: notification.id,
    type: 'COLLABORATION_ACTIVITY',
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
    activity: {
      projectId: notification.payload.projectId,
      projectName: notification.payload.projectName,
      actorUserId: notification.payload.actorUserId,
      actorUsername: notification.payload.actorUsername,
      actorEmail: notification.payload.actorEmail,
      actionType: notification.payload.actionType,
      message: notification.payload.message,
      updatedAt: notification.updatedAt.toISOString(),
      fileId,
      fileName,
      folderId,
      folderName,
      itemPath: notification.payload.itemPath,
    },
  };
}

export async function notifyProjectOwnerAboutActivity(
  transaction: NotificationClient,
  input: NotifyProjectOwnerAboutActivityInput
) {
  const [project, actor] = await Promise.all([
    transaction.project.findUnique({
      where: { id: input.projectId },
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    }),
    transaction.user.findUnique({
      where: { id: input.actorUserId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    }),
  ]);

  if (!project || !actor || project.ownerId === actor.id) {
    return;
  }

  const payload: ProjectOwnerActivityPayload = {
    projectId: project.id,
    projectName: project.name,
    actorUserId: actor.id,
    actorUsername: actor.username,
    actorEmail: actor.email,
    actionType: input.actionType,
    itemId: input.itemId ?? null,
    itemName: input.itemName ?? null,
    itemPath: input.itemPath ?? null,
    itemType: input.itemType ?? null,
    message: buildOwnerActivityMessage({
      actorUsername: actor.username,
      projectName: project.name,
      actionType: input.actionType,
      itemName: input.itemName ?? null,
    }),
  };

  await transaction.notification.create({
    data: {
      userId: project.ownerId,
      type: 'PROJECT_OWNER_ACTIVITY',
      readAt: null,
      payload,
    },
  });
}

export async function listNotifications(userId: string): Promise<NotificationSummary[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      archivedAt: null,
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
    orderBy: [{ createdAt: 'desc' }],
  });

  return notifications.flatMap((notification) => {
    if (notification.type === 'PROJECT_OWNER_ACTIVITY') {
      const summary = toActivitySummary(notification);
      return summary ? [summary] : [];
    }

    const invitation = notification.projectInvitation;

    if (!invitation || invitation.status !== 'PENDING') {
      return [];
    }

    return [
      {
        id: notification.id,
        type: 'PROJECT_INVITATION' as const,
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
          status: 'pending' as const,
          createdAt: invitation.createdAt.toISOString(),
          updatedAt: invitation.updatedAt.toISOString(),
        },
      },
    ];
  });
}
