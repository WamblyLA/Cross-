import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('auth.validation.integration', () => {
  it('returns 400 for invalid register body', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: 'ab',
      email: 'not-an-email',
      password: '123',
      passwordConfirm: '456',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid login body', async () => {
    const response = await request(app).post('/api/auth/login').send({
      login: 'ab',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 for protected notifications endpoint without auth', async () => {
    const response = await request(app).get('/api/notifications');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
