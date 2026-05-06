import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';

function createTelegramResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

const fetchMock = vi.fn<typeof fetch>();

describe('bugReports.integration', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('submits an anonymous bug report', async () => {
    fetchMock.mockResolvedValue(
      createTelegramResponse(200, { ok: true, result: { message_id: 1 } })
    );

    const response = await request(app)
      .post('/api/bug-reports')
      .set('X-Forwarded-For', '198.51.100.10')
      .send({
        title: 'App freezes on launch',
        description: 'The IDE hangs during startup and never reaches the ready state.',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns validation error for too-short title', async () => {
    const response = await request(app)
      .post('/api/bug-reports')
      .set('X-Forwarded-For', '198.51.100.11')
      .send({
        title: 'ab',
        description: 'This description is long enough, but the title is intentionally invalid.',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 429 after the fourth request from same client in the rate limit window', async () => {
    fetchMock.mockImplementation(async () =>
      createTelegramResponse(200, { ok: true, result: { message_id: 2 } })
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request(app)
        .post('/api/bug-reports')
        .set('X-Forwarded-For', '203.0.113.40')
        .send({
          title: 'Repeated bug report',
          description: 'Same client sends several reports to trigger rate limiting safely.',
        });

      expect(response.status).toBe(200);
    }

    const limitedResponse = await request(app)
      .post('/api/bug-reports')
      .set('X-Forwarded-For', '203.0.113.40')
      .send({
        title: 'Repeated bug report',
        description: 'Same client sends several reports to trigger rate limiting safely.',
      });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.error.code).toBe('RATE_LIMITED');
  });

  it('returns generic failure when Telegram delivery fails', async () => {
    fetchMock.mockResolvedValue(
      createTelegramResponse(500, { ok: false, description: 'telegram error' })
    );

    const response = await request(app)
      .post('/api/bug-reports')
      .set('X-Forwarded-For', '198.51.100.14')
      .send({
        title: 'Notification cannot be sent',
        description: 'The client should receive a safe backend error instead of Telegram details.',
      });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('BUG_REPORT_FAILED');
  });
});
