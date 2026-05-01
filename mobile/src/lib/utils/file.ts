import type { FileKind } from "../../types/files";
import type { ProjectAccessRole } from "../../types/projects";

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

export function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : "";
}

export function isEditorOpenSupported(fileName: string) {
  const extension = getFileExtension(fileName);

  if (!extension) {
    return true;
  }

  return !UNSUPPORTED_BINARY_EXTENSIONS.has(extension);
}

export function getFileKind(fileName: string): FileKind {
  const extension = getFileExtension(fileName);

  if (extension === "md") {
    return "markdown";
  }

  if (extension === "ipynb") {
    return "notebook";
  }

  return "text";
}

export function formatRoleLabel(role: ProjectAccessRole) {
  switch (role) {
    case "owner":
      return "Владелец";
    case "editor":
      return "Редактор";
    case "viewer":
      return "Наблюдатель";
    default:
      return "Доступ";
  }
}
