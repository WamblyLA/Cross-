import { Prisma } from '../../generated/prisma/index.js';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/lib/errors.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { createMockResponse } from '../helpers/http.js';

describe('errorHandler.middleware', () => {
  it('returns structured AppError response', () => {
    const res = createMockResponse();

    errorHandler(
      new AppError('boom', 418, [{ path: 'body.name', message: 'bad' }], 'TEAPOT'),
      {} as any,
      res as any,
      vi.fn()
    );

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'TEAPOT',
        message: 'boom',
        details: [{ path: 'body.name', message: 'bad' }],
      },
    });
  });

  it('maps Prisma unique conflict to 409', () => {
    const res = createMockResponse();
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });

    errorHandler(error, {} as any, res as any, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'CONFLICT',
        message: expect.any(String),
      },
    });
  });

  it('returns 500 for unexpected errors', () => {
    const res = createMockResponse();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('unexpected'), {} as any, res as any, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: expect.any(String),
      },
    });

    consoleErrorSpy.mockRestore();
  });
});
