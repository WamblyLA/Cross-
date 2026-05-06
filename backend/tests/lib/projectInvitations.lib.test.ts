import { beforeEach, describe, expect, it, vi } from 'vitest';

const accessMocks = vi.hoisted(() => ({
  requireProjectOwnerAccess: vi.fn(),
  requireProjectReadAccess: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
  notifyProjectOwnerAboutActivity: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  projectInvitation: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  projectMember: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  projectInvitation: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  projectMember: {
    upsert: vi.fn(),
  },
  notification: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../../src/lib/projectAccess.js', () => accessMocks);
vi.mock('../../src/lib/notifications.js', () => notificationMocks);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import {
  acceptProjectInvitation,
  createProjectInvitation,
  listPendingProjectInvitationsForOwnerView,
  revokeProjectInvitation,
} from '../../src/lib/projectInvitations.js';

describe('projectInvitations.lib', () => {
  const createdAt = new Date('2026-01-01T10:00:00.000Z');
  const updatedAt = new Date('2026-01-01T11:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(txMock));
  });

  it('does not expose pending invitations to non-owner view', async () => {
    accessMocks.requireProjectReadAccess.mockResolvedValue({ isOwner: false });

    await expect(listPendingProjectInvitationsForOwnerView('user-1', 'project-1')).resolves.toEqual(
      []
    );
  });

  it('rejects invitation for unknown user', async () => {
    accessMocks.requireProjectOwnerAccess.mockResolvedValue({ project: { ownerId: 'owner-1' } });
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      createProjectInvitation({
        userId: 'owner-1',
        projectId: 'project-1',
        email: 'missing@example.com',
        role: 'viewer',
      })
    ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });

  it('rejects invitation for an existing project member', async () => {
    accessMocks.requireProjectOwnerAccess.mockResolvedValue({ project: { ownerId: 'owner-1' } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-2',
      username: 'you',
      email: 'you@example.com',
    });
    prismaMock.projectMember.findUnique.mockResolvedValue({ id: 'member-1' });

    await expect(
      createProjectInvitation({
        userId: 'owner-1',
        projectId: 'project-1',
        email: 'you@example.com',
        role: 'editor',
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_MEMBER' });
  });

  it('creates a pending invitation and notification', async () => {
    accessMocks.requireProjectOwnerAccess.mockResolvedValue({ project: { ownerId: 'owner-1' } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-3',
      username: 'bob',
      email: 'bob@example.com',
    });
    prismaMock.projectMember.findUnique.mockResolvedValue(null);
    txMock.projectInvitation.findUnique.mockResolvedValue(null);
    txMock.projectInvitation.create.mockResolvedValue({
      id: 'invitation-2',
      projectId: 'project-1',
      inviteeUserId: 'user-3',
      role: 'VIEWER',
      status: 'PENDING',
      createdAt,
      updatedAt,
      invitee: {
        username: 'bob',
        email: 'bob@example.com',
      },
    });

    const invitation = await createProjectInvitation({
      userId: 'owner-1',
      projectId: 'project-1',
      email: 'bob@example.com',
      role: 'viewer',
    });

    expect(txMock.notification.upsert).toHaveBeenCalled();
    expect(invitation).toMatchObject({
      id: 'invitation-2',
      email: 'bob@example.com',
      role: 'viewer',
      status: 'pending',
    });
  });

  it('revokes pending invitation and archives its notification', async () => {
    accessMocks.requireProjectOwnerAccess.mockResolvedValue({});
    txMock.projectInvitation.findFirst.mockResolvedValue({
      id: 'invitation-1',
      status: 'PENDING',
    });

    await revokeProjectInvitation({
      userId: 'owner-1',
      projectId: 'project-1',
      invitationId: 'invitation-1',
    });

    expect(txMock.projectInvitation.update).toHaveBeenCalled();
    expect(txMock.notification.updateMany).toHaveBeenCalled();
  });

  it('accepts invitation, adds member and notifies owner', async () => {
    txMock.projectInvitation.findFirst.mockResolvedValue({
      id: 'invitation-1',
      projectId: 'project-1',
      inviteeUserId: 'user-2',
      role: 'EDITOR',
      status: 'PENDING',
      project: {
        id: 'project-1',
        ownerId: 'owner-1',
      },
    });

    const result = await acceptProjectInvitation('user-2', 'invitation-1');

    expect(txMock.projectMember.upsert).toHaveBeenCalled();
    expect(notificationMocks.notifyProjectOwnerAboutActivity).toHaveBeenCalledWith(txMock, {
      projectId: 'project-1',
      actorUserId: 'user-2',
      actionType: 'joined_project',
    });
    expect(result).toEqual({
      invitationId: 'invitation-1',
      projectId: 'project-1',
    });
  });
});
