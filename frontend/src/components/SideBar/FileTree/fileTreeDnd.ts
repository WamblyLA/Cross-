import { getParentPath, isSameOrChildPath } from "../../../utils/path";
import type { DropTarget, WorkspaceTreeNode } from "./fileTreeTypes";
import { pruneNestedPaths, remapTrackedPaths, uniqPaths } from "./fileTreeUtils";

export function resolveDropDirectory(
  rootPath: string | null,
  target: DropTarget | null,
  nodeByPath: Map<string, WorkspaceTreeNode>,
) {
  if (!rootPath || !target) {
    return null;
  }

  if (target.kind === "root") {
    return rootPath;
  }

  const targetNode = nodeByPath.get(target.path);

  if (!targetNode || targetNode.type !== "folder") {
    return null;
  }

  return targetNode.path;
}

export function normalizeDraggedPaths(draggedPaths: string[], rootPath: string | null) {
  return pruneNestedPaths(draggedPaths).filter((path) => path && path !== rootPath);
}

export function canDropIntoDirectory(
  draggedPaths: string[],
  targetDirectory: string | null,
  rootPath: string | null,
) {
  if (!rootPath || !targetDirectory) {
    return false;
  }

  const normalizedPaths = normalizeDraggedPaths(draggedPaths, rootPath);

  if (normalizedPaths.length === 0) {
    return false;
  }

  if (normalizedPaths.some((sourcePath) => isSameOrChildPath(targetDirectory, sourcePath))) {
    return false;
  }

  return normalizedPaths.some(
    (sourcePath) => (getParentPath(sourcePath) ?? rootPath) !== targetDirectory,
  );
}

export function computeNextExpandedAfterMove(
  expandedPaths: string[],
  sourcePaths: string[],
  movedPaths: string[],
  targetDirectory: string,
  rootPath: string | null,
) {
  return remapTrackedPaths(
    uniqPaths(targetDirectory === rootPath ? expandedPaths : [...expandedPaths, targetDirectory]),
    sourcePaths,
    movedPaths,
  );
}
