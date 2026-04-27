export type FsNodeType = "file" | "folder";

function trimTrailingSeparators(value: string) {
  return value.replace(/[\\/]+$/, "");
}

export function detectPathSeparator(filePath: string) {
  return filePath.includes("\\") ? "\\" : "/";
}

export function getBaseName(filePath: string) {
  const normalized = trimTrailingSeparators(filePath);
  const parts = normalized.split(/[\\/]/).filter(Boolean);

  return parts.at(-1) ?? normalized;
}

export function getExtension(filePath: string) {
  const baseName = getBaseName(filePath);
  const index = baseName.lastIndexOf(".");

  if (index <= 0 || index === baseName.length - 1) {
    return null;
  }

  return baseName.slice(index + 1);
}

export function getParentPath(filePath: string) {
  const normalized = trimTrailingSeparators(filePath);
  const lastSlash = Math.max(normalized.lastIndexOf("\\"), normalized.lastIndexOf("/"));

  if (lastSlash <= 0) {
    return normalized;
  }

  return normalized.slice(0, lastSlash);
}

export function joinFsPath(parentPath: string, name: string) {
  const separator = detectPathSeparator(parentPath);
  const normalizedParent = trimTrailingSeparators(parentPath);

  return `${normalizedParent}${separator}${name}`;
}

export function replacePathPrefix(filePath: string, oldPrefix: string, newPrefix: string) {
  if (filePath === oldPrefix) {
    return newPrefix;
  }

  const separator = detectPathSeparator(oldPrefix);
  const withSeparator = `${oldPrefix}${separator}`;

  if (!filePath.startsWith(withSeparator)) {
    return filePath;
  }

  return `${newPrefix}${filePath.slice(oldPrefix.length)}`;
}

export function isSameOrChildPath(filePath: string, prefix: string) {
  if (filePath === prefix) {
    return true;
  }

  const separator = detectPathSeparator(prefix);

  return filePath.startsWith(`${prefix}${separator}`);
}
