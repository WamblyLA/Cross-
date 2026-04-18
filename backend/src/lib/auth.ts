import type { Response } from "express";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import {
  COOKIE_NAME,
  COOKIE_SAME_SITE,
  COOKIE_SECURE,
  JWT_EXPIRES_IN,
  JWT_SECRET,
} from "../config.js";

type AuthJwtPayload = JwtPayload & {
  sub: string;
};

export function extractBearerToken(headerValue: string | undefined) {
  if (!headerValue || !headerValue.startsWith("Bearer ")) {
    return null;
  }

  const token = headerValue.slice(7).trim();

  return token || null;
}

function parseExpiresInToMs(value: string) {
  const match = value.trim().match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();

  const unitToMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  if (!unit) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const multiplier = unitToMs[unit];

  if (!multiplier) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  return amount * multiplier;
}

export function signAuthToken(userId: string) {
  const expiresIn = JWT_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>;

  return jwt.sign(
    { sub: userId },
    JWT_SECRET,
    { expiresIn },
  );
}

export function verifyAuthToken(token: string) {
  const payload = jwt.verify(token, JWT_SECRET);

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Некорректный токен");
  }

  return payload as AuthJwtPayload;
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: parseExpiresInToMs(JWT_EXPIRES_IN),
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,
    secure: COOKIE_SECURE,
    path: "/",
  });
}

export function createAuthResponse(
  user: { id: string; username: string; email: string },
  token: string,
) {
  return {
    token,
    expiresIn: JWT_EXPIRES_IN,
    user,
  };
}
