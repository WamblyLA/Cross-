import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadCorsOrigins(nodeEnv: "development" | "production", corsOrigin?: string) {
  vi.resetModules();
  process.env.NODE_ENV = nodeEnv;

  if (corsOrigin === undefined) {
    delete process.env.CORS_ORIGIN;
  } else {
    process.env.CORS_ORIGIN = corsOrigin;
  }

  const config = await import("../src/config.js");
  return config.CORS_ORIGINS;
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("CORS origin configuration", () => {
  it("does not add localhost origins in production", async () => {
    await expect(loadCorsOrigins("production", "https://crosspp.ru")).resolves.toEqual([
      "https://crosspp.ru",
    ]);
  });

  it("uses local Vite origins by default in development", async () => {
    await expect(loadCorsOrigins("development")).resolves.toEqual([
      "http://127.0.0.1:4173",
      "http://localhost:4173",
    ]);
  });
});
