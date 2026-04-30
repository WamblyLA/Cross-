import type { FileKind } from "../../types/files";
import { getFileExtension, getFileKind } from "../../lib/utils/file";

const SUPPORTED_LOCAL_EXTENSIONS = new Set(["md", "ipynb", "py", "cpp", "txt", "json", "csv"]);

const MIME_EXTENSION_FALLBACK: Record<string, string> = {
  "application/json": "json",
  "application/octet-stream": "",
  "application/x-ipynb+json": "ipynb",
  "application/x-jupyter": "ipynb",
  "application/x-jupyter+json": "ipynb",
  "text/csv": "csv",
  "text/markdown": "md",
  "text/plain": "txt",
  "text/x-c++src": "cpp",
  "text/x-csrc": "cpp",
  "text/x-python": "py",
};

const EXTENSION_MIME_TYPE: Record<string, string> = {
  cpp: "text/x-c++src",
  csv: "text/csv",
  ipynb: "application/x-ipynb+json",
  json: "application/json",
  md: "text/markdown",
  py: "text/x-python",
  txt: "text/plain",
};

function sanitizeFileName(fileName: string) {
  return fileName.trim().replace(/[\\/:*?"<>|]/g, "_");
}

function getUriFileName(uri: string) {
  const normalizedUri = uri.split("?")[0] ?? uri;
  const segments = normalizedUri.split("/");
  const candidate = segments[segments.length - 1]?.trim() ?? "";

  return candidate ? decodeURIComponent(candidate) : "";
}

export function inferExtensionFromMimeType(mimeType: string | null | undefined) {
  if (!mimeType) {
    return "";
  }

  return MIME_EXTENSION_FALLBACK[mimeType.toLowerCase()] ?? "";
}

export function resolveLocalFileName(
  fileName: string | null,
  uri: string,
  mimeType: string | null,
) {
  const explicitName = sanitizeFileName(fileName?.trim() ?? "");

  if (explicitName) {
    return explicitName;
  }

  const uriFileName = sanitizeFileName(getUriFileName(uri));

  if (uriFileName) {
    return uriFileName;
  }

  const extension = inferExtensionFromMimeType(mimeType);
  return extension ? `local-file.${extension}` : "local-file";
}

export function getSupportedLocalFileKind(fileName: string): FileKind | null {
  const extension = getFileExtension(fileName);

  if (!SUPPORTED_LOCAL_EXTENSIONS.has(extension)) {
    return null;
  }

  return getFileKind(fileName);
}

export function getLocalFileMimeType(fileName: string, fallbackMimeType: string | null) {
  const extension = getFileExtension(fileName);

  return EXTENSION_MIME_TYPE[extension] ?? fallbackMimeType ?? "text/plain";
}
