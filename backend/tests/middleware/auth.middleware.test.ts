import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_NAME } from '../../src/config.js';
import { AppError } from '../../src/lib/errors.js';

const authLibMocks = vi.hoisted(() => ({
  extractBearerToken: vi.fn(),
  verifyAuthToken: vi.fn(),
}));

vi.mock('../../src/lib/auth.js', () => authLibMocks);

import { optionalAuth, requireAuth } from '../../src/middleware/auth.js';

describe('auth.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authenticates request from cookie token', () => {
    authLibMocks.verifyAuthToken.mockReturnValue({ sub: 'user-1' });
    const req = {
      cookies: { [COOKIE_NAME]: 'cookie-token' },
      headers: {},
    } as any;
    const next = vi.fn();

    requireAuth(req, {} as any, next);

    expect(req.userId).toBe('user-1');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects request without auth token', () => {
    authLibMocks.extractBearerToken.mockReturnValue(null);
    const next = vi.fn();

    requireAuth({ cookies: {}, headers: {} } as any, {} as any, next);

    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
  });

  it('ignores invalid token in optional auth', () => {
    authLibMocks.extractBearerToken.mockReturnValue('bad-token');
    authLibMocks.verifyAuthToken.mockImplementation(() => {
      throw new Error('bad token');
    });
    const req = {
      userId: 'stale-user',
      cookies: {},
      headers: { authorization: 'Bearer bad-token' },
    } as any;
    const next = vi.fn();

    optionalAuth(req, {} as any, next);

    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});
