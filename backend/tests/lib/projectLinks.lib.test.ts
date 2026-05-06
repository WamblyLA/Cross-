import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
  },
  projectLink: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import { createProjectLink } from '../../src/lib/projectLinks.js';

describe('projectLinks.lib', () => {
  const createdAt = new Date('2026-01-01T10:00:00.000Z');
  const updatedAt = new Date('2026-01-01T11:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows creating links only for owned projects', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);

    await expect(
      createProjectLink({
        userId: 'user-1',
        projectId: 'project-1',
        clientBindingKey: 'binding-1',
        localRootLabel: 'Root',
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects binding key already attached to another project', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'project-1', name: 'Alpha' });
    prismaMock.projectLink.findFirst.mockResolvedValue({
      id: 'link-1',
      projectId: 'project-2',
      clientBindingKey: 'binding-1',
      localRootLabel: 'Root',
      lastSyncAt: null,
      lastSyncDirection: null,
      createdAt,
      updatedAt,
      project: { name: 'Beta' },
    });

    await expect(
      createProjectLink({
        userId: 'user-1',
        projectId: 'project-1',
        clientBindingKey: 'binding-1',
        localRootLabel: 'Root',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('creates a new local link for owned project', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'project-1', name: 'Alpha' });
    prismaMock.projectLink.findFirst.mockResolvedValue(null);
    prismaMock.projectLink.create.mockResolvedValue({
      id: 'link-2',
      projectId: 'project-1',
      clientBindingKey: 'binding-2',
      localRootLabel: 'Root',
      lastSyncAt: null,
      lastSyncDirection: null,
      createdAt,
      updatedAt,
      project: { name: 'Alpha' },
    });

    const link = await createProjectLink({
      userId: 'user-1',
      projectId: 'project-1',
      clientBindingKey: 'binding-2',
      localRootLabel: 'Root',
    });

    expect(link).toMatchObject({
      id: 'link-2',
      projectId: 'project-1',
      projectName: 'Alpha',
    });
  });
});
