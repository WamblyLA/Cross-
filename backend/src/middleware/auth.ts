import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAME } from "../config.js";
import { extractBearerToken, verifyAuthToken } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";

export function requireAuth(req: Request, _: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] ?? extractBearerToken(req.headers.authorization);

  if (!token) {
    next(new AppError("Требуется авторизация", 401, undefined, "UNAUTHORIZED"));
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError("Неверный или просроченный токен", 401, undefined, "UNAUTHORIZED"));
  }
}
