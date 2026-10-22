import { getExtension } from "../../utils/path";

const UNSUPPORTED_BINARY_EXTENSIONS = new Set([
  "7z",
  "a",
  "avi",
  "bin",
  "bmp",
  "class",
  "dll",
  "doc",
  "docx",
  "dylib",
  "eot",
  "exe",
  "gif",
  "gz",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "lock",
  "mov",
  "mp3",
  "mp4",
  "o",
  "obj",
  "otf",
  "pdf",
  "png",
  "pyc",
  "so",
  "sqlite",
  "tar",
  "ttf",
  "wav",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xls",
  "xlsx",
  "zip",
]);

export function isEditorOpenSupported(fileName: string) {
  const extension = getExtension(fileName)?.toLowerCase() ?? "";

  if (!extension) {
    return true;
  }

  return !UNSUPPORTED_BINARY_EXTENSIONS.has(extension);
}

export function isRealtimeSupportedCloudFileName(fileName: string) {
  const extension = getExtension(fileName)?.toLowerCase() ?? "";

  return extension !== "ipynb" && isEditorOpenSupported(fileName);
}

export function getUnsupportedFileOpenMessage(fileName: string) {
  return `Файл "${fileName}" нельзя открыть в текстовом редакторе: тип файла не поддерживается`;
}

export function getUnsupportedFileTransferMessage(fileName: string) {
  return `Невозможно перенести файл "${fileName}": этот тип файла пока не поддерживается`;
}
