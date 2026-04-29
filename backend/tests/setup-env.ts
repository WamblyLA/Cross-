import { afterAll } from "vitest";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/crosspp_test";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "7d";
process.env.CORS_ORIGIN = "http://127.0.0.1:4173";
process.env.COOKIE_SAME_SITE = "lax";
process.env.COOKIE_SECURE = "false";

afterAll(async () => {
  const { prisma } = await import("../src/lib/prisma.js");
  await prisma.$disconnect();
});
