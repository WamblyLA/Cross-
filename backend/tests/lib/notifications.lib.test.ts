import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  notification: {
    findMany: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import { listNotifications, notifyProjectOwnerAboutActivity } from '../../src/lib/notifications.js';

describe('notifications.lib', () => {
  const createdAt = new Date('2026-01-01T10:00:00.000Z');
  const updatedAt = new Date('2026-01-01T11:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates owner activity notification for member action', async () => {
    const tx = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'project-1',
          ownerId: 'owner-1',
          name: 'Alpha',
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-2',
          username: 'you',
          email: 'you@example.com',
        }),
      },
      notification: { create: vi.fn() },
    } as any;

    await notifyProjectOwnerAboutActivity(tx, {
      projectId: 'project-1',
      actorUserId: 'user-2',
      actionType: 'deleted_file',
      itemId: 'file-1',
      itemName: 'README.md',
      itemType: 'file',
    });

    expect(tx.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'owner-1',
          type: 'PROJECT_OWNER_ACTIVITY',
          readAt: null,
        }),
      })
    );
  });

  it('returns only pending invitations and valid activity notifications', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'notification-invitation',
        type: 'PROJECT_INVITATION',
        createdAt,
        updatedAt,
        readAt: null,
        payload: null,
        projectInvitation: {
          id: 'invitation-1',
          projectId: 'project-1',
          role: 'EDITOR',
          status: 'PENDING',
          createdAt,
          updatedAt,
          project: { id: 'project-1', name: 'Alpha' },
          inviter: {
            id: 'owner-1',
            username: 'owner',
            email: 'owner@example.com',
          },
        },
      },
      {
        id: 'notification-activity',
        type: 'PROJECT_OWNER_ACTIVITY',
        createdAt,
        updatedAt,
        readAt: createdAt,
        payload: {
          projectId: 'project-2',
          projectName: 'Beta',
          actorUserId: 'user-2',
          actorUsername: 'you',
          actorEmail: 'you@example.com',
          actionType: 'deleted_folder',
          itemId: 'folder-1',
          itemName: 'Design',
          itemPath: '/Design',
          itemType: 'folder',
          message: 'you removed folder',
        },
        projectInvitation: null,
      },
      {
        id: 'notification-invalid',
        type: 'PROJECT_OWNER_ACTIVITY',
        createdAt,
        updatedAt,
        readAt: null,
        payload: { projectId: 'broken' },
        projectInvitation: null,
      },
      {
        id: 'notification-declined',
        type: 'PROJECT_INVITATION',
        createdAt,
        updatedAt,
        readAt: null,
        payload: null,
        projectInvitation: {
          id: 'invitation-2',
          projectId: 'project-3',
          role: 'VIEWER',
          status: 'DECLINED',
          createdAt,
          updatedAt,
          project: { id: 'project-3', name: 'Gamma' },
          inviter: {
            id: 'owner-2',
            username: 'bob',
            email: 'bob@example.com',
          },
        },
      },
    ]);

    const notifications = await listNotifications('user-1');

    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toMatchObject({ type: 'PROJECT_INVITATION' });
    expect(notifications[1]).toMatchObject({ type: 'COLLABORATION_ACTIVITY' });
  });
});
