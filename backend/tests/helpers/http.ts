import { vi } from 'vitest';

export function createMockResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  response.send.mockReturnValue(response);
  response.cookie.mockReturnValue(response);
  response.clearCookie.mockReturnValue(response);

  return response;
}
