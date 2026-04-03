import { joinFsPath } from "../../utils/path";

export function resolveLocalFsPath(rootPath: string, relativePath: string) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .reduce((currentPath, segment) => joinFsPath(currentPath, segment), rootPath);
}
