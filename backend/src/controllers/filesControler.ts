import { Request, Response } from "express";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
export const getElemsInFolder = (req: Request, res: Response) => {
  const folderPath = req.query.path as string;
  if (!folderPath) {
    return res.status(400).json({ error: "No folder path" });
  }
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: "No such folder" });
  }
  const files = fs.readdirSync(folderPath).map((file) => {
    const fullPath = path.join(folderPath, file);
    const isDirectory = fs.statSync(fullPath).isDirectory();
    return { name: file, isDirectory };
  });
  res.json({ files });
};
export const getFileContent = (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    return res.status(400).json({ error: "No file path" });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "No such file" });
  }
  if (!fs.statSync(filePath).isFile()) {
    return res.status(400).json({ error: "Path is not a file" });
  }
  const content = fs.readFileSync(filePath, "utf-8");
  res.json({ content });
};
export const saveFileChanges = async (req: Request, res: Response) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "No file path" });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "No such file" });
    }
    if (!fs.statSync(filePath).isFile()) {
      return res.status(400).json({ error: "Path is not a file" });
    }
    await fsPromises.writeFile(filePath, content ?? "", "utf-8");
    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка при сохранении файла", err);
    res.status(500).json({ error: "Не удалось сохранить файл" });
  }
};
export const createFilder = async (req: Request, res: Response) => {
  try {
    const { path: parentPath, name, isFolder } = req.body;
    if (!parentPath || !name) {
      return res
        .status(400)
        .json({ error: "Отсутствует имя или родительская папка" });
    }
    const fullPath = path.join(parentPath, name);
    if (fs.existsSync(fullPath)) {
      return res.status(400).json({ error: "Такой объект уже существует" });
    }
    if (isFolder) {
      await fsPromises.mkdir(fullPath, { recursive: true });
    } else {
      await fsPromises.writeFile(fullPath, "", "utf-8");
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка при создании файла", err);
    res.status(500).json({ error: "Не удалось создать файл" });
  }
};
export const deleteFilder = async (req: Request, res: Response) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath) {
      return res.status(400).json({ error: "Отсутствует имя" });
    }
    if (!fs.existsSync(targetPath)) {
      return res.status(400).json({ error: "Этого объекта не существует" });
    }
    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      await fsPromises.rm(targetPath, { recursive: true, force: true });
    } else {
      await fsPromises.unlink(targetPath);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Ошибка при удалении", err);
    return res.status(500).json({ error: "Не удалось удалить объект" });
  }
};
