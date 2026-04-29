import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("http error handling", () => {
  it("returns structured 404 payload for unknown routes", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: "NOT_FOUND",
      },
    });
    expect(response.body.error.message).toEqual(expect.any(String));
  });
});
