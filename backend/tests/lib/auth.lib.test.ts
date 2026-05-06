import { describe, expect, it, vi } from 'vitest';
import { COOKIE_NAME, JWT_EXPIRES_IN } from '../../src/config.js';
import {
  clearAuthCookie,
  createAuthResponse,
  extractBearerToken,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
} from '../../src/lib/auth.js';

describe('auth.lib', () => {
  it('extracts bearer token only from valid Authorization header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('Bearer   token-123  ')).toBe('token-123');
  });

  it('signs and verifies auth token for a user id', () => {
    const token = signAuthToken('user-1');
    const payload = verifyAuthToken(token);

    expect(payload.sub).toBe('user-1');
  });

  it('sets and clears auth cookie with backend cookie name', () => {
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any;

    setAuthCookie(res, 'token-1');
    clearAuthCookie(res);

    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      'token-1',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
      })
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        path: '/',
      })
    );
  });

  it('creates auth response with token, expiry and public user data', () => {
    expect(
      createAuthResponse(
        {
          id: 'user-1',
          username: 'you',
          email: 'you@example.com',
        },
        'token-1'
      )
    ).toEqual({
      token: 'token-1',
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: 'user-1',
        username: 'you',
        email: 'you@example.com',
      },
    });
  });
});
