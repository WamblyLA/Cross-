import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/lib/errors.js';
import { validateRequest } from '../../src/middleware/validate.js';

describe('validate.middleware', () => {
  it('normalizes body, params and query after successful validation', () => {
    const middleware = validateRequest({
      params: z.object({ id: z.string().trim() }),
      query: z.object({ search: z.string().trim().min(1) }),
      body: z.object({ name: z.string().trim().min(1) }),
    });
    const req = {
      params: { id: '  abc  ' },
      query: { search: '  hello  ' },
      body: { name: '  project  ' },
    } as any;
    const next = vi.fn();

    middleware(req, {} as any, next);

    expect(req.params).toEqual({ id: 'abc' });
    expect(req.query).toEqual({ search: 'hello' });
    expect(req.body).toEqual({ name: 'project' });
    expect(next).toHaveBeenCalledWith();
  });

  it('returns validation error details for invalid input', () => {
    const middleware = validateRequest({
      body: z.object({ name: z.string().min(3) }),
    });
    const next = vi.fn();

    middleware({ body: { name: 'ab' } } as any, {} as any, next);

    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'name' })])
    );
  });
});
