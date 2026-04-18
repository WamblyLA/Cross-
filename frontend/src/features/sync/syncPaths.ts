import { joinFsPath } from "../../utils/path";
import type { CloudProjectTree } from "../cloud/cloudTypes";

export function resolveLocalFsPath(rootPath: string, relativePath: string) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .reduce((currentPath, segment) => joinFsPath(currentPath, segment), rootPath);
}

export function toSyncRelativePath(rootPath: string, targetPath: string) {
  const normalizedRoot = rootPath.replace(/[\\/]+$/, "");
  const normalizedTarget = targetPath.replace(/[\\/]+$/, "");

  if (normalizedTarget !== normalizedRoot && !normalizedTarget.startsWith(`${normalizedRoot}\\`) && !normalizedTarget.startsWith(`${normalizedRoot}/`)) {
    return null;
  }

  const relativePath = normalizedTarget
    .slice(normalizedRoot.length)
    .replace(/^[\\/]+/, "")
    .replace(/[\\]+/g, "/");

  return relativePath || null;
}

export function findCloudFileRelativePathById(
  tree: CloudProjectTree | null | undefined,
  fileId: string,
  parentRelativePath = "",
): string | null {
  if (!tree) {
    return null;
  }

  for (const file of tree.files) {
    if (file.id === fileId) {
      return parentRelativePath ? `${parentRelativePath}/${file.name}` : file.name;
    }
  }

  for (const folder of tree.folders) {
    const nextRelativePath = parentRelativePath ? `${parentRelativePath}/${folder.name}` : folder.name;

    for (const file of folder.files) {
      if (file.id === fileId) {
        return `${nextRelativePath}/${file.name}`;
      }
    }

    const nestedRelativePath = findCloudFileRelativePathById(
      {
        projectId: tree.projectId,
        folders: folder.folders,
        files: [],
      },
      fileId,
      nextRelativePath,
    );

    if (nestedRelativePath) {
      return nestedRelativePath;
    }
  }

  return null;
}
