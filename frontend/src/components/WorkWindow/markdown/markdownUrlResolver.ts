import { getParentPath } from "../../../utils/path";

function normalizePathSlashes(value: string) {
  return value.replace(/\\/g, "/");
}

function isCloudEditorPath(value: string) {
  return /^cloud:\/\//i.test(value);
}

function isWindowsAbsolutePath(value: string) {
  return /^[A-Za-z]:[\\/]/.test(value);
}

function isUncPath(value: string) {
  return value.startsWith("\\\\");
}

function isPosixAbsolutePath(value: string) {
  return value.startsWith("/");
}

function isFileProtocol(value: string) {
  return /^file:/i.test(value);
}

function isExternalProtocol(value: string) {
  return /^(https?:|mailto:|tel:|#)/i.test(value);
}

function toDirectoryFileUrl(directoryPath: string) {
  const normalized = normalizePathSlashes(directoryPath).replace(/\/+$/, "");

  if (normalized.startsWith("//")) {
    return encodeURI(`file:${normalized}/`);
  }

  if (isWindowsAbsolutePath(normalized)) {
    return encodeURI(`file:///${normalized}/`);
  }

  return encodeURI(`file://${normalized}/`);
}

export function isResolvableLocalMarkdownPath(filePath: string) {
  if (!filePath || isCloudEditorPath(filePath) || isFileProtocol(filePath)) {
    return false;
  }

  return isWindowsAbsolutePath(filePath) || isUncPath(filePath) || isPosixAbsolutePath(filePath);
}

export function toFileUrl(filePath: string) {
  const normalized = normalizePathSlashes(filePath);

  if (normalized.startsWith("file://")) {
    return normalized;
  }

  if (normalized.startsWith("//")) {
    return encodeURI(`file:${normalized}`);
  }

  if (isWindowsAbsolutePath(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }

  return encodeURI(`file://${normalized}`);
}

export function resolveMarkdownBaseHref(filePath: string) {
  if (!isResolvableLocalMarkdownPath(filePath)) {
    return "";
  }

  const parentPath = getParentPath(filePath);

  if (!parentPath) {
    return "";
  }

  const baseHref = toDirectoryFileUrl(parentPath);
  return baseHref.endsWith("/") ? baseHref : `${baseHref}/`;
}

export function resolveMarkdownUrl(rawUrl: string, filePath: string, isImage = false) {
  const trimmedUrl = rawUrl.trim().replace(/^<|>$/g, "");

  if (!trimmedUrl || /^javascript:/i.test(trimmedUrl)) {
    return null;
  }

  if (isExternalProtocol(trimmedUrl) || isFileProtocol(trimmedUrl)) {
    return trimmedUrl;
  }

  if (isImage && /^data:image\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (isWindowsAbsolutePath(trimmedUrl) || isUncPath(trimmedUrl) || isPosixAbsolutePath(trimmedUrl)) {
    return toFileUrl(trimmedUrl);
  }

  const baseHref = resolveMarkdownBaseHref(filePath);

  if (!baseHref) {
    return trimmedUrl;
  }

  try {
    return new URL(trimmedUrl.replace(/\\/g, "/"), baseHref).toString();
  } catch {
    return trimmedUrl;
  }
}
