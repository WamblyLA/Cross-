import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireUserId } from "../lib/requestContext.js";
import { DEFAULT_SETTINGS, type UpdateSettingsBody } from "../lib/validation.js";

export async function getMySettings(req: Request, res: Response) {
  const userId = requireUserId(req);

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      ...DEFAULT_SETTINGS,
    },
  });

  res.json({ settings });
}

export async function updateMySettings(req: Request, res: Response) {
  const userId = requireUserId(req);
  const data = req.body as UpdateSettingsBody;

  const updateData = {
    ...(data.theme !== undefined ? { theme: data.theme } : {}),
    ...(data.fontSize !== undefined ? { fontSize: data.fontSize } : {}),
    ...(data.tabSize !== undefined ? { tabSize: data.tabSize } : {}),
  };

  const createData = {
    ...DEFAULT_SETTINGS,
    ...updateData,
  };

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      ...createData,
    },
  });

  res.json({ settings });
}
