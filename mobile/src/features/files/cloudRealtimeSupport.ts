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

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === normalized.length - 1) {
    return "";
  }

  return normalized.slice(dotIndex + 1);
}

export function isRealtimeSupportedCloudFileName(fileName: string) {
  const extension = getFileExtension(fileName);

  if (extension === "ipynb") {
    return false;
  }

  if (!extension) {
    return true;
  }

  return !UNSUPPORTED_BINARY_EXTENSIONS.has(extension);
}
