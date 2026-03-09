import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../services/ws.js";

async function checkProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    return { ok: false, reason: "Project not found" as const };
  }

  if (project.ownerId !== userId) {
    return { ok: false, reason: "Forbidden" as const };
  }

  return { ok: true, project };
}

export async function getElemsInFolder(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const projectId = req.query.projectId as string;
    const folderPath = ((req.query.path as string) || "").trim();

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!projectId) {
      return res.status(400).json({ error: "No projectId" });
    }

    const access = await checkProjectAccess(projectId, userId);

    if (!access.ok) {
      return res.status(access.reason === "Project not found" ? 404 : 403).json({
        error: access.reason
      });
    }

    const files = await prisma.file.findMany({
      where: { projectId }
    });

    const normalizedFolder = folderPath.replace(/^\/+|\/+$/g, "");
    const prefix = normalizedFolder ? `${normalizedFolder}/` : "";

    const map = new Map<string, { name: string; isDirectory: boolean }>();

    for (const file of files) {
      if (!file.path.startsWith(prefix)) {
        continue;
      }

      const rest = file.path.slice(prefix.length);
      if (!rest) {
        continue;
      }

      const parts = rest.split("/").filter(Boolean);
      if (parts.length === 0) {
        continue;
      }

      const name = parts[0]!;
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
}

export async function getFileContent(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const projectId = req.query.projectId as string;
    const filePath = req.query.path as string;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!projectId || !filePath) {
      return res.status(400).json({ error: "No projectId or file path" });
    }

    const access = await checkProjectAccess(projectId, userId);

    if (!access.ok) {
      return res.status(access.reason === "Project not found" ? 404 : 403).json({
        error: access.reason
      });
    }

    const file = await prisma.file.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: filePath
        }
      }
    });

    if (!file) {
      return res.status(404).json({ error: "No such file" });
    }

    return res.json({ content: file.content });
  } catch (err) {
    console.error("getFileContent error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function saveFileChanges(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const { projectId, path: filePath, content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!projectId || !filePath) {
      return res.status(400).json({ error: "No projectId or file path" });
    }

    const access = await checkProjectAccess(projectId, userId);

    if (!access.ok) {
      return res.status(access.reason === "Project not found" ? 404 : 403).json({
        error: access.reason
      });
    }

    const name = filePath.split("/").filter(Boolean).pop();

    if (!name) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    const file = await prisma.file.upsert({
      where: {
        projectId_path: {
          projectId,
          path: filePath
        }
      },
      update: {
        content: content ?? ""
      },
      create: {
        projectId,
        path: filePath,
        name,
        content: content ?? ""
      }
    });

    broadcast({
      type: "file-updated",
      projectId,
      path: file.path
    });

    return res.json({ success: true, file });
  } catch (err) {
    console.error("saveFileChanges error", err);
    return res.status(500).json({ error: "Не удалось сохранить файл" });
  }
}

export async function createFilder(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const { projectId, path: parentPath = "", name, isFolder } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!projectId || !name) {
      return res.status(400).json({ error: "Нет projectId или name" });
    }

    const access = await checkProjectAccess(projectId, userId);

    if (!access.ok) {
      return res.status(access.reason === "Project not found" ? 404 : 403).json({
        error: access.reason
      });
    }

    const normalizedParent = String(parentPath).replace(/^\/+|\/+$/g, "");
    const fullPath = normalizedParent ? `${normalizedParent}/${name}` : name;

    if (isFolder) {
      broadcast({
        type: "folder-created",
        projectId,
        path: fullPath
      });

      return res.json({ success: true });
    }

    const exists = await prisma.file.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: fullPath
        }
      }
    });

    if (exists) {
      return res.status(400).json({ error: "Такой объект уже существует" });
    }

    const file = await prisma.file.create({
      data: {
        projectId,
        path: fullPath,
        name,
        content: ""
      }
    });

    broadcast({
      type: "file-created",
      projectId,
      path: file.path
    });

    return res.json({ success: true, file });
  } catch (err) {
    console.error("createFilder error", err);
    return res.status(500).json({ error: "Не удалось создать объект" });
  }
}

export async function deleteFilder(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const { projectId, path: targetPath } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!projectId || !targetPath) {
      return res.status(400).json({ error: "Нет projectId или path" });
    }

    const access = await checkProjectAccess(projectId, userId);

    if (!access.ok) {
      return res.status(access.reason === "Project not found" ? 404 : 403).json({
        error: access.reason
      });
    }

    const deleted = await prisma.file.deleteMany({
      where: {
        projectId,
        OR: [
          { path: targetPath },
          { path: { startsWith: `${targetPath}/` } }
        ]
      }
    });

    broadcast({
      type: "file-removed",
      projectId,
      path: targetPath
    });

    return res.json({ success: true, deletedCount: deleted.count });
  } catch (err) {
    console.error("deleteFilder error", err);
    return res.status(500).json({ error: "Не удалось удалить объект" });
  }
}