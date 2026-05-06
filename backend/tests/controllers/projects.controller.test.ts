import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../helpers/http.js';

const prismaMock = vi.hoisted(() => ({
  project: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import { createProject, getProjects } from '../../src/controllers/projectsController.js';

describe('projects.controller', () => {
  const createdAt = new Date('2026-01-01T10:00:00.000Z');
  const updatedAt = new Date('2026-01-01T11:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps owner, editor and viewer roles in project list', async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: 'project-owner',
        ownerId: 'user-1',
        name: 'Owner project',
        createdAt,
        updatedAt,
        members: [],
      },
      {
        id: 'project-editor',
        ownerId: 'owner-2',
        name: 'Editor project',
        createdAt,
        updatedAt,
        members: [{ id: 'member-1', role: 'EDITOR' }],
      },
      {
        id: 'project-viewer',
        ownerId: 'owner-3',
        name: 'Viewer project',
        createdAt,
        updatedAt,
        members: [{ id: 'member-2', role: 'VIEWER' }],
      },
    ]);
    const res = createMockResponse();

    await getProjects({ userId: 'user-1' } as any, res as any);

    expect(res.json).toHaveBeenCalledWith({
      projects: [
        expect.objectContaining({ id: 'project-owner', accessRole: 'owner', isOwner: true }),
        expect.objectContaining({ id: 'project-editor', accessRole: 'editor', isOwner: false }),
        expect.objectContaining({ id: 'project-viewer', accessRole: 'viewer', isOwner: false }),
      ],
    });
  });

  it('creates project owned by current user', async () => {
    prismaMock.project.create.mockResolvedValue({
      id: 'project-1',
      ownerId: 'user-1',
      name: 'Alpha',
      createdAt,
      updatedAt,
    });
    const res = createMockResponse();

    await createProject(
      {
        userId: 'user-1',
        body: { name: 'Alpha' },
      } as any,
      res as any
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      project: {
        id: 'project-1',
        ownerId: 'user-1',
        name: 'Alpha',
        createdAt,
        updatedAt,
        accessRole: 'owner',
        isOwner: true,
      },
    });
  });
});
