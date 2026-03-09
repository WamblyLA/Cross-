import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { broadcast } from "../services/ws.js";

const prisma = new PrismaClient();

export const getElemsInFolder = async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const folderPath = ((req.query.path as string) || "").trim();

    if (!projectId) {
      return res.status(400).json({ error: "No projectId" });
    }

    const files = await prisma.file.findMany({
      where: { projectId },
    });

    const normalizedFolder = folderPath.replace(/^\/+|\/+$/g, "");
    const prefix = normalizedFolder ? `${normalizedFolder}/` : "";

    const map = new Map<string, { name: string; isDirectory: boolean }>();

    for (const file of files) {
      if (!file.path.startsWith(prefix)) continue;

      const rest = file.path.slice(prefix.length);
      if (!rest) continue;

      const parts = rest.split("/").filter(Boolean);
      if (parts.length === 0) continue;

      const name = parts[0];
      const isDirectory = parts.length > 1;

      const prev = map.get(name);
      if (!prev || isDirectory) {
        map.set(name, { name, isDirectory });
      }
    }

    return res.json({ files: Array.from(map.values()) });
  } catch (err) {
    console.error("getElemsInFolder error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getFileContent = async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const filePath = req.query.path as string;

    if (!projectId || !filePath) {
      return res.status(400).json({ error: "No projectId or file path" });
    }

    const file = await prisma.file.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: filePath,
        },
      },
    });

    if (!file) {
      return res.status(404).json({ error: "No such file" });
    }

    return res.json({ content: file.content });
  } catch (err) {
    console.error("getFileContent error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const saveFileChanges = async (req: Request, res: Response) => {
  try {
    const { projectId, path: filePath, content } = req.body;

    if (!projectId || !filePath) {
      return res.status(400).json({ error: "No projectId or file path" });
    }

    const name = filePath.split("/").filter(Boolean).pop();

    if (!name) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    const file = await prisma.file.upsert({
      where: {
        projectId_path: {
          projectId,
          path: filePath,
        },
      },
      update: {
        content: content ?? "",
      },
      create: {
        projectId,
        path: filePath,
        name,
        content: content ?? "",
      },
    });

    broadcast({
      type: "file-updated",
      projectId,
      path: file.path,
      content: file.content,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("saveFileChanges error", err);
    return res.status(500).json({ error: "Не удалось сохранить файл" });
  }
};

export const createFilder = async (req: Request, res: Response) => {
  try {
    const { projectId, path: parentPath = "", name, isFolder } = req.body;

    if (!projectId || !name) {
      return res.status(400).json({ error: "Нет projectId или name" });
    }

    const normalizedParent = String(parentPath).replace(/^\/+|\/+$/g, "");
    const fullPath = normalizedParent ? `${normalizedParent}/${name}` : name;

    if (isFolder) {
      broadcast({
        type: "folder-created",
        projectId,
        path: fullPath,
      });

      return res.json({ success: true });
    }

    const exists = await prisma.file.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: fullPath,
        },
      },
    });

    if (exists) {
      return res.status(400).json({ error: "Такой объект уже существует" });
    }

    await prisma.file.create({
      data: {
        projectId,
        path: fullPath,
        name,
        content: "",
      },
    });

    broadcast({
      type: "file-created",
      projectId,
      path: fullPath,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("createFilder error", err);
    return res.status(500).json({ error: "Не удалось создать объект" });
  }
};

export const deleteFilder = async (req: Request, res: Response) => {
  try {
    const { projectId, path: targetPath } = req.body;

    if (!projectId || !targetPath) {
      return res.status(400).json({ error: "Нет projectId или path" });
    }

    await prisma.file.deleteMany({
      where: {
        projectId,
        OR: [{ path: targetPath }, { path: { startsWith: `${targetPath}/` } }],
      },
    });

    broadcast({
      type: "file-removed",
      projectId,
      path: targetPath,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteFilder error", err);
    return res.status(500).json({ error: "Не удалось удалить объект" });
  }
};
