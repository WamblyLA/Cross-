import { Request, Response } from "express";
import fs from "fs";
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
