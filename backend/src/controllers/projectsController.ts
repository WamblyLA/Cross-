import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getProjects(req: Request, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ projects });
  } catch (err) {
    console.error("getProjects error", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}

export async function createProject(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const { name } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    if (!name) {
      return res.status(400).json({ error: "Необходимо имя проекта" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        ownerId: userId
      }
    });

    return res.json({ project });
  } catch (err) {
    console.error("createProject error", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}