import { createServer, type Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  extractBearerToken: vi.fn(),
  verifyAuthToken: vi.fn(),
}));

const accessMocks = vi.hoisted(() => ({
  getProjectAccess: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  file: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  file: {
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
}));

vi.mock('../../src/lib/auth.js', () => authMocks);
vi.mock('../../src/lib/projectAccess.js', () => accessMocks);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import { setupWebSocketServer } from '../../src/realtime/wsServer.js';

function withTimeout<T>(promise: Promise<T>, label: string, ms = 2000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function waitForOpen(socket: WebSocket) {
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    }),
    'ws open'
  );
}

function waitForUnexpectedResponse(socket: WebSocket) {
  return withTimeout(
    new Promise<number>((resolve, reject) => {
      socket.once('unexpected-response', (_request, response) => {
        resolve(response.statusCode ?? 0);
        response.resume();
      });
      socket.once('error', reject);
    }),
    'unexpected response'
  );
}

function waitForMessage(socket: WebSocket) {
  return withTimeout(
    new Promise<any>((resolve, reject) => {
      socket.once('message', (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
      socket.once('error', reject);
    }),
    'ws message'
  );
}

function closeSocket(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) {
    return Promise.resolve();
  }

  return withTimeout(
    new Promise<void>((resolve) => {
      socket.once('close', () => resolve());
      socket.close();
    }),
    'ws close'
  ).catch(() => {
    socket.terminate();
  });
}

describe('realtime websocket smoke', () => {
  const fileId = '11111111-1111-4111-8111-111111111111';
  let server: HttpServer;
  let baseUrl: string;
  let clients: WebSocket[];

  beforeEach(async () => {
    vi.clearAllMocks();
    clients = [];

    authMocks.extractBearerToken.mockImplementation((header?: string) => {
      if (!header?.startsWith('Bearer ')) {
        return null;
      }

      const token = header.slice(7).trim();
      return token || null;
    });

    authMocks.verifyAuthToken.mockImplementation((token: string) => {
      if (token === 'valid-user-1') {
        return { sub: 'user-1' };
      }

      if (token === 'valid-user-2') {
        return { sub: 'user-2' };
      }

      throw new Error('invalid token');
    });

    accessMocks.getProjectAccess.mockResolvedValue({
      role: 'editor',
    });

    prismaMock.file.findUnique.mockImplementation(async () => ({
      id: fileId,
      projectId: 'project-1',
      name: 'README.md',
      version: 1,
    }));

    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(txMock));
    txMock.file.updateMany.mockResolvedValue({ count: 1 });
    txMock.file.findUniqueOrThrow.mockResolvedValue({
      id: fileId,
      content: 'new content',
      version: 2,
      updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    });

    server = createServer((_req, res) => {
      res.statusCode = 200;
      res.end('ok');
    });

    setupWebSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `ws://127.0.0.1:${address.port}/ws`;
  });

  afterEach(async () => {
    await Promise.all(clients.map((client) => closeSocket(client)));
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it('allows authenticated client to connect', async () => {
    const socket = new WebSocket(baseUrl, {
      headers: {
        Cookie: 'token=valid-user-1',
      },
    });
    clients.push(socket);

    await waitForOpen(socket);

    expect(socket.readyState).toBe(WebSocket.OPEN);
    expect(authMocks.verifyAuthToken).toHaveBeenCalledWith('valid-user-1');
  });

  it('rejects client without token during upgrade', async () => {
    const socket = new WebSocket(baseUrl);
    clients.push(socket);

    await expect(waitForUnexpectedResponse(socket)).resolves.toBe(401);
  });

  it('broadcasts remote_update to other connected participants', async () => {
    const editorA = new WebSocket(baseUrl, {
      headers: {
        Cookie: 'token=valid-user-1',
      },
    });
    const editorB = new WebSocket(baseUrl, {
      headers: {
        Authorization: 'Bearer valid-user-2',
      },
    });
    clients.push(editorA, editorB);

    await Promise.all([waitForOpen(editorA), waitForOpen(editorB)]);

    editorA.send(
      JSON.stringify({
        type: 'join_file',
        payload: { fileId },
      })
    );
    await expect(waitForMessage(editorA)).resolves.toEqual({
      type: 'joined_file_ack',
      payload: {
        fileId,
        version: 1,
      },
    });

    editorB.send(
      JSON.stringify({
        type: 'join_file',
        payload: { fileId },
      })
    );
    await expect(waitForMessage(editorB)).resolves.toEqual({
      type: 'joined_file_ack',
      payload: {
        fileId,
        version: 1,
      },
    });

    const senderAckPromise = waitForMessage(editorA);
    const peerUpdatePromise = waitForMessage(editorB);

    editorA.send(
      JSON.stringify({
        type: 'content_update',
        payload: {
          fileId,
          content: 'new content',
          baseVersion: 1,
        },
      })
    );

    await expect(senderAckPromise).resolves.toEqual({
      type: 'content_update_ack',
      payload: {
        fileId,
        version: 2,
        updatedAt: '2026-01-01T12:00:00.000Z',
      },
    });
    await expect(peerUpdatePromise).resolves.toEqual({
      type: 'remote_update',
      payload: {
        fileId,
        content: 'new content',
        version: 2,
        updatedAt: '2026-01-01T12:00:00.000Z',
      },
    });
  });
});
