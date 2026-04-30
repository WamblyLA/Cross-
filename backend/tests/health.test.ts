import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("health endpoints", () => {
  it("returns ok on GET /health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns ok on GET /api/health", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
