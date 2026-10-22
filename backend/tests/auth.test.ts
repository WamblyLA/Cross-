import type { IncomingMessage } from "node:http";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";
import { COOKIE_NAME } from "../src/config.js";
import * as auth from "../src/lib/auth.js";
import { requireAuth } from "../src/middleware/auth.js";
import { authenticateWebSocketRequest } from "../src/realtime/wsAuth.js";

function websocketRequest(headers: IncomingMessage["headers"]) {
  return { headers } as IncomingMessage;
}

function authenticateHttpRequest(req: Request) {
  let nextError: unknown;
  const next: NextFunction = (error) => {
    nextError = error;
  };

  requireAuth(req, {} as Response, next);

  return nextError;
}

describe("authentication tokens", () => {
  it("extracts a trimmed Bearer token", () => {
    expect(auth.extractBearerToken("Bearer   mobile-token  ")).toBe("mobile-token");
  });

  it("rejects malformed Authorization headers", () => {
    expect(auth.extractBearerToken("Basic credentials")).toBeNull();
    expect(auth.extractBearerToken("bearer lowercase-token")).toBeNull();
    expect(auth.extractBearerToken("Bearer    ")).toBeNull();
  });

  it("prefers the authentication cookie over the Bearer header", () => {
    expect(auth.resolveAuthToken("cookie-token", "Bearer header-token")).toBe("cookie-token");
  });

  it("uses the Bearer header when the authentication cookie is absent", () => {
    expect(auth.resolveAuthToken(undefined, "Bearer header-token")).toBe("header-token");
  });

  it("does not fall back to the Bearer header for an explicitly empty cookie", () => {
    expect(auth.resolveAuthToken("", "Bearer header-token")).toBeNull();
  });

  it("preserves the public authentication response shape", () => {
    expect(
      auth.createAuthResponse(
        { id: "user-id", username: "dmitry", email: "dmitry@example.com" },
        "signed-token",
      ),
    ).toEqual({
      token: "signed-token",
      expiresIn: "7d",
      user: {
        id: "user-id",
        username: "dmitry",
        email: "dmitry@example.com",
      },
    });
  });
});

describe("HTTP authentication", () => {
  it("assigns the user from a signed Bearer token", () => {
    const token = auth.signAuthToken("bearer-user");
    const req = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` },
    } as Request;

    expect(authenticateHttpRequest(req)).toBeUndefined();
    expect(req.userId).toBe("bearer-user");
  });

  it("assigns the user from a signed authentication cookie", () => {
    const token = auth.signAuthToken("cookie-user");
    const req = {
      cookies: { [COOKIE_NAME]: token },
      headers: {},
    } as Request;

    expect(authenticateHttpRequest(req)).toBeUndefined();
    expect(req.userId).toBe("cookie-user");
  });

  it("rejects a missing credential", async () => {
    const response = await request(app).get("/api/me");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("rejects an invalid Bearer token", async () => {
    const response = await request(app)
      .get("/api/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });
});

describe("WebSocket authentication", () => {
  it("authenticates a signed cookie token", () => {
    const token = auth.signAuthToken("cookie-user");

    expect(
      authenticateWebSocketRequest(websocketRequest({ cookie: `token=${token}` })),
    ).toEqual({ userId: "cookie-user" });
  });

  it("authenticates a signed Bearer token", () => {
    const token = auth.signAuthToken("bearer-user");

    expect(
      authenticateWebSocketRequest(
        websocketRequest({ authorization: `Bearer ${token}` }),
      ),
    ).toEqual({ userId: "bearer-user" });
  });

  it("rejects an invalid token", () => {
    expect(() =>
      authenticateWebSocketRequest(
        websocketRequest({ authorization: "Bearer invalid-token" }),
      ),
    ).toThrow();
  });
});
