import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { listNotifications } from "../lib/notifications.js";

function requireUserId(req: Request) {
  if (!req.userId) {
    throw new AppError("Требуется авторизация", 401, undefined, "UNAUTHORIZED");
  }

  return req.userId;
}

export async function getNotifications(req: Request, res: Response) {
  const userId = requireUserId(req);
  const notifications = await listNotifications(userId);
  res.json({ notifications });
}
