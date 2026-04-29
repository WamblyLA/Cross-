import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAME } from "../config.js";
import { extractBearerToken, verifyAuthToken } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";

function resolveAuthToken(req: Request) {
  const token = req.cookies?.[COOKIE_NAME] ?? extractBearerToken(req.headers.authorization);

  return token || null;
}

function assignUserIdIfTokenIsValid(req: Request, token: string) {
  const payload = verifyAuthToken(token);
  req.userId = payload.sub;
}

export function requireAuth(req: Request, _: Response, next: NextFunction) {
  const token = resolveAuthToken(req);

  if (!token) {
    next(new AppError("Требуется авторизация", 401, undefined, "UNAUTHORIZED"));
    return;
  }

  try {
    assignUserIdIfTokenIsValid(req, token);
    next();
  } catch {
    next(new AppError("Неверный или просроченный токен", 401, undefined, "UNAUTHORIZED"));
  }
}

export function optionalAuth(req: Request, _: Response, next: NextFunction) {
  const token = resolveAuthToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    assignUserIdIfTokenIsValid(req, token);
  } catch {
    delete req.userId;
  }

  next();
}
