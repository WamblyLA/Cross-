import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../helpers/http.js';

const bcryptMocks = vi.hoisted(() => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const authMocks = vi.hoisted(() => ({
  signAuthToken: vi.fn(),
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  createAuthResponse: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock('bcrypt', () => bcryptMocks);
vi.mock('../../src/lib/auth.js', () => authMocks);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

import { login, register } from '../../src/controllers/authController.js';

describe('auth.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.createAuthResponse.mockImplementation((user, token) => ({
      user,
      token,
      expiresIn: '7d',
    }));
  });

  it('rejects register when username is already taken', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ username: 'you', email: 'you@example.com' }]);

    await expect(
      register(
        {
          body: {
            username: 'you',
            email: 'new@example.com',
            password: 'password123',
          },
        } as any,
        createMockResponse() as any
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('registers a user and sets auth cookie', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    bcryptMocks.default.hash.mockResolvedValue('hashed-password');
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      username: 'you',
      email: 'you@example.com',
    });
    authMocks.signAuthToken.mockReturnValue('token-1');
    const res = createMockResponse();

    await register(
      {
        body: {
          username: 'you',
          email: 'you@example.com',
          password: 'password123',
        },
      } as any,
      res as any
    );

    expect(authMocks.setAuthCookie).toHaveBeenCalledWith(res, 'token-1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 'user-1',
        username: 'you',
        email: 'you@example.com',
      },
      token: 'token-1',
      expiresIn: '7d',
    });
  });

  it('rejects login with wrong password', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      username: 'you',
      email: 'you@example.com',
      passwordHash: 'stored-hash',
    });
    bcryptMocks.default.compare.mockResolvedValue(false);

    await expect(
      login(
        {
          body: {
            login: 'you',
            password: 'wrong',
          },
        } as any,
        createMockResponse() as any
      )
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
