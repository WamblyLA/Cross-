import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../helpers/http.js';

const cloudMocks = vi.hoisted(() => ({
  findSiblingFile: vi.fn(),
}));

const accessMocks = vi.hoisted(() => ({
  assertFolderInProject: vi.fn(),
  getProjectFileForAccess: vi.fn(),
  requireProjectReadAccess: vi.fn(),
  requireProjectWriteAccess: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  file: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  file: {
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
}));

vi.mock('../../src/lib/cloudExplorer.js', () => cloudMocks);
vi.mock('../../src/lib/projectAccess.js', () => accessMocks);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import {
  createFile,
  getProjectFile,
  updateProjectFile,
} from '../../src/controllers/filesController.js';

describe('files.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(txMock));
  });

  it('rejects duplicate file names in the same folder', async () => {
    accessMocks.requireProjectWriteAccess.mockResolvedValue({});
    accessMocks.assertFolderInProject.mockResolvedValue(null);
    cloudMocks.findSiblingFile.mockResolvedValue({ id: 'existing-file' });

    await expect(
      createFile(
        {
          userId: 'user-1',
          params: { projectId: 'project-1' },
          body: { name: 'README.md', content: '', folderId: null },
        } as any,
        createMockResponse() as any
      )
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('returns canWrite=false for viewers', async () => {
    accessMocks.getProjectFileForAccess.mockResolvedValue({ id: 'file-1', name: 'README.md' });
    accessMocks.requireProjectReadAccess.mockResolvedValue({ role: 'viewer' });
    const res = createMockResponse();

    await getProjectFile(
      {
        userId: 'user-1',
        params: { projectId: 'project-1', id: 'file-1' },
      } as any,
      res as any
    );

    expect(res.json).toHaveBeenCalledWith({
      file: {
        id: 'file-1',
        name: 'README.md',
        canWrite: false,
      },
    });
  });

  it('rejects stale expectedVersion on update', async () => {
    accessMocks.getProjectFileForAccess.mockResolvedValue({
      id: 'file-1',
      name: 'README.md',
      folderId: null,
      version: 3,
    });

    await expect(
      updateProjectFile(
        {
          userId: 'user-1',
          params: { projectId: 'project-1', id: 'file-1' },
          body: { expectedVersion: 2, content: 'new content' },
        } as any,
        createMockResponse() as any
      )
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});
