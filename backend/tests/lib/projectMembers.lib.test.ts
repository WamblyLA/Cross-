import { beforeEach, describe, expect, it, vi } from 'vitest';

const accessMocks = vi.hoisted(() => ({
  requireProjectOwnerAccess: vi.fn(),
  requireProjectReadAccess: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
  projectMember: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  projectLink: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../../src/lib/projectAccess.js', () => accessMocks);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import {
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
} from '../../src/lib/projectMembers.js';

describe('projectMembers.lib', () => {
  const createdAt = new Date('2026-01-01T10:00:00.000Z');
  const updatedAt = new Date('2026-01-01T11:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns owner first in member list', async () => {
    accessMocks.requireProjectReadAccess.mockResolvedValue({});
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
      name: 'Alpha',
      createdAt,
      updatedAt,
      owner: {
        id: 'owner-1',
        username: 'owner',
        email: 'owner@example.com',
      },
      members: [
        {
          id: 'member-1',
          userId: 'user-2',
          role: 'EDITOR',
          createdAt,
          updatedAt,
          user: {
            username: 'you',
            email: 'you@example.com',
          },
        },
      ],
    });

    const members = await listProjectMembers('user-1', 'project-1');

    expect(members[0]).toMatchObject({ userId: 'owner-1', role: 'owner', isOwner: true });
    expect(members[1]).toMatchObject({ userId: 'user-2', role: 'editor', isOwner: false });
  });

  it('does not allow changing owner role through member endpoint', async () => {
    accessMocks.requireProjectOwnerAccess.mockResolvedValue({ project: { ownerId: 'owner-1' } });

    await expect(
      updateProjectMemberRole({
        userId: 'owner-1',
        projectId: 'project-1',
        memberId: 'owner-1',
        role: 'viewer',
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'OWNER_CANNOT_BE_REMOVED' });
  });

  it('removes member and linked local bindings together', async () => {
    accessMocks.requireProjectOwnerAccess.mockResolvedValue({ project: { ownerId: 'owner-1' } });
    prismaMock.projectMember.findFirst.mockResolvedValue({
      id: 'member-1',
      userId: 'user-2',
    });
    prismaMock.projectLink.deleteMany.mockReturnValue('delete-links-op');
    prismaMock.projectMember.delete.mockReturnValue('delete-member-op');
    prismaMock.$transaction.mockResolvedValue([]);

    await removeProjectMember({
      userId: 'owner-1',
      projectId: 'project-1',
      memberId: 'member-1',
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith(['delete-links-op', 'delete-member-op']);
  });
});
