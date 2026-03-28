import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { DEFAULT_SETTINGS, type UpdateSettingsBody } from "../lib/validation.js";

export async function getMySettings(req: Request, res: Response) {
  const userId = req.userId;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

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
  const userId = req.userId;
  const data = req.body as UpdateSettingsBody;

  if (!userId) {
    throw new AppError("Требуется авторизация", 401);
  }

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
