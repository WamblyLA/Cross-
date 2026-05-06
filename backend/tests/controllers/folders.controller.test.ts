import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../helpers/http.js';

const cloudMocks = vi.hoisted(() => ({
  findSiblingFolder: vi.fn(),
  listDeletedFolderFileIds: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
  notifyProjectOwnerAboutActivity: vi.fn(),
}));

const accessMocks = vi.hoisted(() => ({
  assertFolderInProject: vi.fn(),
  getProjectFolderForAccess: vi.fn(),
  requireProjectWriteAccess: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  folder: {
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  folder: {
    delete: vi.fn(),
  },
}));

vi.mock('../../src/lib/cloudExplorer.js', () => cloudMocks);
vi.mock('../../src/lib/notifications.js', () => notificationMocks);
vi.mock('../../src/lib/projectAccess.js', () => accessMocks);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import {
  createFolder,
  deleteFolder,
  updateFolder,
} from '../../src/controllers/foldersController.js';

describe('folders.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(txMock));
  });

  it('rejects duplicate folder on create', async () => {
    accessMocks.requireProjectWriteAccess.mockResolvedValue({});
    accessMocks.assertFolderInProject.mockResolvedValue(null);
    cloudMocks.findSiblingFolder.mockResolvedValue({ id: 'folder-2' });

    await expect(
      createFolder(
        {
          userId: 'user-1',
          params: { projectId: 'project-1' },
          body: { name: 'Docs', parentId: null },
        } as any,
        createMockResponse() as any
      )
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('rejects duplicate folder name on rename', async () => {
    accessMocks.getProjectFolderForAccess.mockResolvedValue({
      id: 'folder-1',
      parentId: null,
      name: 'Docs',
    });
    cloudMocks.findSiblingFolder.mockResolvedValue({ id: 'folder-2' });

    await expect(
      updateFolder(
        {
          userId: 'user-1',
          params: { projectId: 'project-1', id: 'folder-1' },
          body: { name: 'Other' },
        } as any,
        createMockResponse() as any
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns deleted file ids when a folder is removed', async () => {
    accessMocks.getProjectFolderForAccess.mockResolvedValue({ id: 'folder-1', name: 'Docs' });
    cloudMocks.listDeletedFolderFileIds.mockResolvedValue(['file-1', 'file-2']);
    const res = createMockResponse();

    await deleteFolder(
      {
        userId: 'user-1',
        params: { projectId: 'project-1', id: 'folder-1' },
      } as any,
      res as any
    );

    expect(notificationMocks.notifyProjectOwnerAboutActivity).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      folderId: 'folder-1',
      deletedFileIds: ['file-1', 'file-2'],
    });
  });
});
