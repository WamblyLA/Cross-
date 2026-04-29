import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { buildBugReportTelegramMessage } from "../src/lib/bugReports.js";

function createTelegramResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

const fetchMock = vi.fn<typeof fetch>();

describe("bug reports", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("submits an anonymous bug report", async () => {
    fetchMock.mockResolvedValue(createTelegramResponse(200, { ok: true, result: { message_id: 1 } }));

    const response = await request(app)
      .post("/api/bug-reports")
      .set("X-Forwarded-For", "198.51.100.10")
      .send({
        title: "Падает запуск",
        description: "После нажатия на кнопку запуска IDE зависает на этапе подготовки.",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for a too-short title", async () => {
    const response = await request(app)
      .post("/api/bug-reports")
      .set("X-Forwarded-For", "198.51.100.11")
      .send({
        title: "ab",
        description: "Описание достаточно длинное для прохождения проверки.",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "title",
          }),
        ]),
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid description length", async () => {
    const shortDescriptionResponse = await request(app)
      .post("/api/bug-reports")
      .set("X-Forwarded-For", "198.51.100.12")
      .send({
        title: "Короткое описание",
        description: "Коротко",
      });

    const longDescriptionResponse = await request(app)
      .post("/api/bug-reports")
      .set("X-Forwarded-For", "198.51.100.13")
      .send({
        title: "Слишком длинное описание",
        description: "a".repeat(4001),
      });

    expect(shortDescriptionResponse.status).toBe(400);
    expect(longDescriptionResponse.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 429 after the fourth request in the rate limit window", async () => {
    fetchMock.mockImplementation(async () =>
      createTelegramResponse(200, { ok: true, result: { message_id: 2 } }),
    );

    const payload = {
      title: "Повторяемый баг",
      description: "Одно и то же сообщение для проверки rate limit на bug reports.",
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request(app)
        .post("/api/bug-reports")
        .set("X-Forwarded-For", "203.0.113.40")
        .send(payload);

      expect(response.status).toBe(200);
    }

    const limitedResponse = await request(app)
      .post("/api/bug-reports")
      .set("X-Forwarded-For", "203.0.113.40")
      .send(payload);

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body).toMatchObject({
      error: {
        code: "RATE_LIMITED",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns a generic error when Telegram delivery fails", async () => {
    fetchMock.mockResolvedValue(createTelegramResponse(500, { ok: false, description: "telegram error" }));

    const response = await request(app)
      .post("/api/bug-reports")
      .set("X-Forwarded-For", "198.51.100.14")
      .send({
        title: "Не уходит уведомление",
        description: "Нужно убедиться, что клиент получает только generic error.",
      });

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: {
        code: "BUG_REPORT_FAILED",
        message: "Не удалось отправить сообщение. Попробуйте позже.",
      },
    });
  });

  it("builds a message for authenticated users and truncates oversized descriptions safely", () => {
    const message = buildBugReportTelegramMessage({
      title: "Очень длинный баг",
      description: "x".repeat(5000),
      reporter: {
        kind: "authenticated",
        userId: "user-123",
        username: "demo-user",
        email: "demo@example.com",
      },
      userAgent: "CrossPPMobile/1.0",
    });

    expect(message).toContain("Reporter: authenticated | userId=user-123 | username=demo-user | email=demo@example.com");
    expect(message).toContain("User-Agent: CrossPPMobile/1.0");
    expect(message.length).toBeLessThanOrEqual(4096);
    expect(message.endsWith("\n...")).toBe(true);
  });

  it("builds a message for anonymous reporters", () => {
    const message = buildBugReportTelegramMessage({
      title: "Anonymous issue",
      description: "A detailed anonymous report that still reaches Telegram safely.",
      reporter: {
        kind: "anonymous",
      },
    });

    expect(message).toContain("Reporter: anonymous");
    expect(message).toContain("Title:\nAnonymous issue");
  });
});
