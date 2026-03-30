import {
  isSameOrChildPath,
  replacePathPrefix,
  type FsNodeType,
} from "../../../utils/path";
import type {
  FileSystemItem,
  TreeDraft,
  WorkspaceTreeNode,
} from "./fileTreeTypes";

export function toTreeNode(item: FileSystemItem): WorkspaceTreeNode {
  return {
    name: item.name,
    path: item.path,
    type: item.isDirectory ? "folder" : "file",
    children: [],
    isLoaded: !item.isDirectory,
  };
}

export async function loadFolderNodes(folderPath: string) {
  const items = await window.electronAPI.listFolder(folderPath);
  return items.map(toTreeNode);
}

export async function loadExpandedTree(
  folderPath: string,
  expandedPaths: Set<string>,
): Promise<WorkspaceTreeNode[]> {
  const nodes = await loadFolderNodes(folderPath);

  return Promise.all(
    nodes.map(async (node): Promise<WorkspaceTreeNode> => {
      if (node.type !== "folder" || !expandedPaths.has(node.path)) {
        return node;
      }

      return {
        ...node,
        children: await loadExpandedTree(node.path, expandedPaths),
        isLoaded: true,
      };
    }),
  );
}

export function replaceNodeChildren(
  nodes: WorkspaceTreeNode[],
  targetPath: string,
  updater: (node: WorkspaceTreeNode) => WorkspaceTreeNode,
): WorkspaceTreeNode[] {
  let didChange = false;

  const nextNodes = nodes.map((node) => {
    if (node.path === targetPath) {
      didChange = true;
      return updater(node);
    }

    if (node.type !== "folder" || node.children.length === 0) {
      return node;
    }

    const nextChildren = replaceNodeChildren(node.children, targetPath, updater);

    if (nextChildren === node.children) {
      return node;
    }

    didChange = true;

    return {
      ...node,
      children: nextChildren,
    };
  });

  return didChange ? nextNodes : nodes;
}

export function uniqPaths(paths: string[]) {
  return Array.from(new Set(paths));
}

export function pruneNestedPaths(paths: string[]) {
  const uniquePaths = uniqPaths(paths).sort((left, right) => left.length - right.length);

  return uniquePaths.filter(
    (path, index) =>
      !uniquePaths.slice(0, index).some((candidatePath) => isSameOrChildPath(path, candidatePath)),
  );
}

export function remapTrackedPaths(paths: string[], sourcePaths: string[], movedPaths: string[]) {
  return uniqPaths(
    paths.map((trackedPath) => {
      let nextPath = trackedPath;

      sourcePaths.forEach((sourcePath, index) => {
        const movedPath = movedPaths[index];

        if (!movedPath || movedPath === sourcePath) {
          return;
        }

        if (isSameOrChildPath(nextPath, sourcePath)) {
          nextPath = replacePathPrefix(nextPath, sourcePath, movedPath);
        }
      });

      return nextPath;
    }),
  );
}

export function hasPrimaryModifier(event: Pick<MouseEvent | KeyboardEvent, "ctrlKey" | "metaKey">) {
  return event.ctrlKey || event.metaKey;
}

export function getDropTargetKey(target: { kind: "root" } | { kind: "folder"; path: string } | null) {
  if (!target) {
    return null;
  }

  return target.kind === "root" ? "root" : `folder:${target.path}`;
}

export function getDraftPlaceholder(nodeType: FsNodeType) {
  return nodeType === "folder" ? "Имя новой папки" : "Имя нового файла";
}

export function getRenamePlaceholder(draft: TreeDraft | null) {
  if (!draft) {
    return "";
  }

  return draft.nodeType === "folder" ? "Имя папки" : "Имя файла";
}
