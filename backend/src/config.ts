import { z } from "zod";

const DEFAULT_PORT = 3000;
const DEFAULT_RENDERER_ORIGIN = "http://127.0.0.1:4173";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
  CORS_ORIGIN: z.string().default(DEFAULT_RENDERER_ORIGIN),
  DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET обязателен"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JSON_BODY_LIMIT: z.string().default("1mb"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Некорректная конфигурация окружения:", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Не удалось прочитать переменные окружения");
}

function parseOrigins(value: string) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const env = parsedEnv.data;

export const NODE_ENV = env.NODE_ENV;
export const IS_PROD = NODE_ENV === "production";
export const PORT = env.PORT;
export const DATABASE_URL = env.DATABASE_URL;
export const JWT_SECRET = env.JWT_SECRET;
export const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
export const JSON_BODY_LIMIT = env.JSON_BODY_LIMIT;
export const CORS_ORIGINS = parseOrigins(env.CORS_ORIGIN);
export const API_URL = `http://127.0.0.1:${PORT}`;
export const COOKIE_NAME = "token";
export const BCRYPT_SALT_ROUNDS = 12;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX = 10;
