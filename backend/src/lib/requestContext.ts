import type { Request } from "express";
import { AppError } from "./errors.js";

export function requireUserId(
  req: Pick<Request, "userId">,
  errorCode?: string,
) {
  if (!req.userId) {
    throw new AppError("Требуется авторизация", 401, undefined, errorCode);
  }

  return req.userId;
}

export function getOptionalTrimmedQueryString(
  query: Request["query"],
  key: string,
) {
  const value = query[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
}
