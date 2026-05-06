import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
  },
  file: {
    findFirst: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import {
  getProjectAccess,
  getProjectFileForAccess,
  requireProjectOwnerAccess,
  requireProjectReadAccess,
  requireProjectWriteAccess,
} from '../../src/lib/projectAccess.js';

describe('projectAccess.lib', () => {
  const now = new Date('2026-01-01T10:00:00.000Z');

  function projectRecord(input?: {
    ownerId?: string;
    members?: Array<{ id: string; role: string }>;
  }) {
    return {
      id: 'project-1',
      ownerId: input?.ownerId ?? 'owner-1',
      name: 'Alpha',
      createdAt: now,
      updatedAt: now,
      members: input?.members ?? [],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns owner access for project owner', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRecord());

    const access = await getProjectAccess('owner-1', 'project-1');

    expect(access).toMatchObject({
      role: 'owner',
      isOwner: true,
      membershipId: null,
    });
  });

  it('returns not found for a user without project access', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);

    await expect(requireProjectReadAccess('user-1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PROJECT_NOT_FOUND',
    });
  });

  it('rejects write access for viewers', async () => {
    prismaMock.project.findFirst.mockResolvedValue(
      projectRecord({ members: [{ id: 'member-1', role: 'VIEWER' }] })
    );

    await expect(requireProjectWriteAccess('viewer-1', 'project-1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects owner-only actions for non-owners', async () => {
    prismaMock.project.findFirst.mockResolvedValue(
      projectRecord({ members: [{ id: 'member-1', role: 'EDITOR' }] })
    );

    await expect(requireProjectOwnerAccess('editor-1', 'project-1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('returns file only after access check and fails if file is missing', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRecord());
    prismaMock.file.findFirst.mockResolvedValueOnce({
      id: 'file-1',
      projectId: 'project-1',
      name: 'README.md',
    });
    prismaMock.file.findFirst.mockResolvedValueOnce(null);

    await expect(getProjectFileForAccess('owner-1', 'project-1', 'file-1')).resolves.toMatchObject({
      id: 'file-1',
    });
    await expect(getProjectFileForAccess('owner-1', 'project-1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'FILE_NOT_FOUND',
    });
  });
});
