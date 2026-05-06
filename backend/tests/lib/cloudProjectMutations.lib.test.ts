import { beforeEach, describe, expect, it, vi } from 'vitest';

const accessMocks = vi.hoisted(() => ({
  assertFolderInProject: vi.fn(),
  getProjectFileForAccess: vi.fn(),
  getProjectFolderForAccess: vi.fn(),
  requireProjectWriteAccess: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  folder: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  file: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  folder: {
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  file: {
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('../../src/lib/projectAccess.js', () => accessMocks);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import {
  listDeletedFolderFileIds,
  moveProjectFileForAccess,
  moveProjectFolderForAccess,
} from '../../src/lib/cloudProjectMutations.js';

describe('cloudProjectMutations.lib', () => {
  const createdAt = new Date('2026-01-01T10:00:00.000Z');
  const updatedAt = new Date('2026-01-01T11:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(txMock));
  });

  it('collects file ids that will be deleted with a folder subtree', async () => {
    prismaMock.folder.findMany.mockResolvedValue([
      { id: 'root', parentId: null },
      { id: 'child', parentId: 'root' },
      { id: 'leaf', parentId: 'child' },
    ]);
    prismaMock.file.findMany.mockResolvedValue([{ id: 'file-1' }, { id: 'file-2' }]);

    const deletedFileIds = await listDeletedFolderFileIds('project-1', 'root');

    expect(deletedFileIds).toEqual(['file-1', 'file-2']);
  });

  it('rejects moving file into a folder with duplicate name', async () => {
    accessMocks.getProjectFileForAccess.mockResolvedValue({
      id: 'file-1',
      projectId: 'project-1',
      folderId: null,
      name: 'README.md',
    });
    accessMocks.requireProjectWriteAccess.mockResolvedValue({});
    accessMocks.assertFolderInProject.mockResolvedValue(null);
    prismaMock.file.findFirst.mockResolvedValue({ id: 'file-2' });

    await expect(
      moveProjectFileForAccess('user-1', 'project-1', 'file-1', 'project-2', null)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('moves file to another project and folder', async () => {
    accessMocks.getProjectFileForAccess.mockResolvedValue({
      id: 'file-1',
      projectId: 'project-1',
      folderId: null,
      name: 'README.md',
    });
    accessMocks.requireProjectWriteAccess.mockResolvedValue({});
    accessMocks.assertFolderInProject.mockResolvedValue({ id: 'folder-2' });
    prismaMock.file.findFirst.mockResolvedValue(null);
    prismaMock.file.update.mockResolvedValue({
      id: 'file-1',
      projectId: 'project-2',
      folderId: 'folder-2',
      name: 'README.md',
    });

    const result = await moveProjectFileForAccess(
      'user-1',
      'project-1',
      'file-1',
      'project-2',
      'folder-2'
    );

    expect(result).toEqual({
      file: {
        id: 'file-1',
        projectId: 'project-2',
        folderId: 'folder-2',
        name: 'README.md',
      },
      sourceProjectId: 'project-1',
      targetProjectId: 'project-2',
    });
  });

  it('rejects moving folder into its own descendant', async () => {
    accessMocks.getProjectFolderForAccess.mockResolvedValue({
      id: 'folder-1',
      projectId: 'project-1',
      parentId: null,
      name: 'Docs',
    });
    accessMocks.requireProjectWriteAccess.mockResolvedValue({});
    accessMocks.assertFolderInProject.mockResolvedValue({});
    prismaMock.folder.findMany.mockResolvedValue([
      { id: 'folder-1', parentId: null },
      { id: 'folder-2', parentId: 'folder-1' },
    ]);

    await expect(
      moveProjectFolderForAccess('user-1', 'project-1', 'folder-1', 'project-2', 'folder-2')
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('moves folder subtree to another project', async () => {
    accessMocks.getProjectFolderForAccess.mockResolvedValue({
      id: 'folder-1',
      projectId: 'project-1',
      parentId: null,
      name: 'Docs',
    });
    accessMocks.requireProjectWriteAccess.mockResolvedValue({});
    accessMocks.assertFolderInProject.mockResolvedValue({ id: 'folder-target' });
    prismaMock.folder.findMany.mockResolvedValue([
      { id: 'folder-1', parentId: null },
      { id: 'folder-2', parentId: 'folder-1' },
    ]);
    prismaMock.folder.findFirst.mockResolvedValue(null);
    txMock.folder.update.mockResolvedValue({
      id: 'folder-1',
      projectId: 'project-2',
      parentId: 'folder-target',
      name: 'Docs',
      createdAt,
      updatedAt,
    });
    txMock.file.findMany.mockResolvedValue([
      {
        id: 'file-1',
        projectId: 'project-2',
        folderId: 'folder-2',
        name: 'README.md',
        version: 1,
        createdAt,
        updatedAt,
      },
    ]);

    const result = await moveProjectFolderForAccess(
      'user-1',
      'project-1',
      'folder-1',
      'project-2',
      'folder-target'
    );

    expect(txMock.folder.updateMany).toHaveBeenCalled();
    expect(txMock.file.updateMany).toHaveBeenCalled();
    expect(result).toMatchObject({
      sourceProjectId: 'project-1',
      targetProjectId: 'project-2',
      folder: {
        id: 'folder-1',
        projectId: 'project-2',
      },
      movedFiles: [{ id: 'file-1' }],
    });
  });
});
