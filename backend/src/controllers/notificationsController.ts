import type { Request, Response } from "express";
import { listNotifications } from "../lib/notifications.js";
import { requireUserId } from "../lib/requestContext.js";

export async function getNotifications(req: Request, res: Response) {
  const userId = requireUserId(req, "UNAUTHORIZED");
  const notifications = await listNotifications(userId);
  res.json({ notifications });
}
