import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("auth validation", () => {
  it("returns 400 for invalid register body", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "ab",
      email: "not-an-email",
      password: "123",
      passwordConfirm: "456",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: expect.any(Array),
      },
    });
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it("returns 400 for invalid login body", async () => {
    const response = await request(app).post("/api/auth/login").send({
      login: "ab",
      password: "",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: expect.any(Array),
      },
    });
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });
});
