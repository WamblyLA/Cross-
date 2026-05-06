import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const accessMocks = vi.hoisted(() => ({
  requireProjectReadAccess: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  folder: {
    findMany: vi.fn(),
  },
  file: {
    findMany: vi.fn(),
  },
}));

vi.mock('../../src/lib/projectAccess.js', () => accessMocks);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import {
  buildProjectTree,
  getProjectSyncManifestForAccess,
} from '../../src/lib/cloudProjectRead.js';

describe('cloudProjectRead.lib', () => {
  const createdAt = new Date('2026-01-01T10:00:00.000Z');
  const updatedAt = new Date('2026-01-01T11:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds nested project tree and puts orphaned items at root', () => {
    const tree = buildProjectTree(
      'project-1',
      [
        { id: 'folder-a', projectId: 'project-1', parentId: null, name: 'A', createdAt, updatedAt },
        {
          id: 'folder-child',
          projectId: 'project-1',
          parentId: 'folder-a',
          name: 'Child',
          createdAt,
          updatedAt,
        },
        {
          id: 'folder-orphan',
          projectId: 'project-1',
          parentId: 'missing',
          name: 'Orphan',
          createdAt,
          updatedAt,
        },
      ],
      [
        {
          id: 'file-child',
          projectId: 'project-1',
          folderId: 'folder-a',
          name: 'a.txt',
          version: 1,
          createdAt,
          updatedAt,
        },
        {
          id: 'file-orphan',
          projectId: 'project-1',
          folderId: 'missing',
          name: 'orphan.txt',
          version: 1,
          createdAt,
          updatedAt,
        },
      ]
    );

    expect(tree.folders.map((folder) => folder.name)).toEqual(['A', 'Orphan']);
    expect(tree.folders[0]?.folders.map((folder) => folder.name)).toEqual(['Child']);
    expect(tree.folders[0]?.files.map((file) => file.name)).toEqual(['a.txt']);
    expect(tree.files.map((file) => file.name)).toEqual(['orphan.txt']);
  });

  it('builds sync manifest filtered by targetRelativePath', async () => {
    accessMocks.requireProjectReadAccess.mockResolvedValue({
      project: { id: 'project-1', name: 'Alpha' },
    });
    prismaMock.folder.findMany.mockResolvedValue([
      {
        id: 'folder-1',
        projectId: 'project-1',
        parentId: null,
        name: 'Docs',
        createdAt,
        updatedAt,
      },
      {
        id: 'folder-2',
        projectId: 'project-1',
        parentId: 'folder-1',
        name: 'Guides',
        createdAt,
        updatedAt,
      },
    ]);
    prismaMock.file.findMany.mockResolvedValue([
      {
        id: 'file-1',
        projectId: 'project-1',
        folderId: 'folder-2',
        name: 'README.md',
        content: 'hello',
        version: 2,
        updatedAt,
      },
      {
        id: 'file-2',
        projectId: 'project-1',
        folderId: null,
        name: 'root.txt',
        content: 'root',
        version: 1,
        updatedAt,
      },
    ]);

    const manifest = await getProjectSyncManifestForAccess('project-1', 'user-1', 'Docs');

    expect(manifest.folders.map((folder) => folder.relativePath)).toEqual(['Docs', 'Docs/Guides']);
    expect(manifest.files).toEqual([
      {
        id: 'file-1',
        projectId: 'project-1',
        folderId: 'folder-2',
        name: 'README.md',
        version: 2,
        updatedAt,
        relativePath: 'Docs/Guides/README.md',
        contentHash: createHash('sha256').update('hello').digest('hex'),
        contentSize: 5,
      },
    ]);
  });
});
