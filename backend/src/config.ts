import { z } from "zod";

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGINS = ["http://127.0.0.1:4173", "http://localhost:4173"];
const DEFAULT_EMAIL_VERIFICATION_TTL_HOURS = 24;
const DEFAULT_PASSWORD_RESET_TTL_HOURS = 1;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().trim().min(1).default(DEFAULT_HOST),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
  CORS_ORIGIN: z.string().default(DEFAULT_CORS_ORIGINS.join(",")),
  DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET обязателен"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JSON_BODY_LIMIT: z.string().default("1mb"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  APP_PUBLIC_URL: z.string().trim().optional(),
  FRONTEND_PUBLIC_URL: z.string().trim().optional(),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASSWORD: z.string().trim().optional(),
  SMTP_FROM: z.string().trim().optional(),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_EMAIL_VERIFICATION_TTL_HOURS),
  PASSWORD_RESET_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_PASSWORD_RESET_TTL_HOURS),
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
const defaultPublicUrl = DEFAULT_CORS_ORIGINS[0] ?? "http://127.0.0.1:4173";
const configuredPublicUrl = (env.APP_PUBLIC_URL || env.FRONTEND_PUBLIC_URL || defaultPublicUrl)
  .trim()
  .replace(/\/+$/, "");
const smtpFields = [
  env.SMTP_HOST,
  env.SMTP_PORT,
  env.SMTP_USER,
  env.SMTP_PASSWORD,
  env.SMTP_FROM,
];
const hasAnySmtpConfig = smtpFields.some((value) => value !== undefined && value !== "");
const hasFullSmtpConfig = smtpFields.every((value) => value !== undefined && value !== "");

if (hasAnySmtpConfig && !hasFullSmtpConfig) {
  throw new Error("SMTP_* переменные должны быть заполнены полностью или не заданы вовсе");
}

if (env.NODE_ENV === "production") {
  if (!configuredPublicUrl) {
    throw new Error("APP_PUBLIC_URL или FRONTEND_PUBLIC_URL обязателен в production");
  }

  if (!hasFullSmtpConfig) {
    throw new Error("SMTP_* переменные обязательны в production");
  }
}

export const NODE_ENV = env.NODE_ENV;
export const IS_PROD = NODE_ENV === "production";
export const HOST = env.HOST;
export const PORT = env.PORT;
export const DATABASE_URL = env.DATABASE_URL;
export const JWT_SECRET = env.JWT_SECRET;
export const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
export const JSON_BODY_LIMIT = env.JSON_BODY_LIMIT;
export const CORS_ORIGINS = Array.from(
  new Set([...DEFAULT_CORS_ORIGINS, ...parseOrigins(env.CORS_ORIGIN)]),
);
export const COOKIE_SAME_SITE = env.COOKIE_SAME_SITE ?? (IS_PROD ? "none" : "lax");
export const COOKIE_SECURE = env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : IS_PROD;
export const API_URL = `http://${HOST}:${PORT}`;
export const APP_PUBLIC_URL = configuredPublicUrl;
export const COOKIE_NAME = "token";
export const BCRYPT_SALT_ROUNDS = 12;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX = 10;
export const EMAIL_VERIFICATION_TTL_HOURS = env.EMAIL_VERIFICATION_TTL_HOURS;
export const PASSWORD_RESET_TTL_HOURS = env.PASSWORD_RESET_TTL_HOURS;
export const SMTP_CONFIG = hasFullSmtpConfig
  ? {
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT!,
      user: env.SMTP_USER!,
      password: env.SMTP_PASSWORD!,
      from: env.SMTP_FROM!,
    }
  : null;
