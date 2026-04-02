import type {
  CloudFolderTreeNode,
  CloudProjectTree,
} from "../../../features/cloud/cloudTypes";
import type { DropTarget } from "./cloudExplorerTypes";

export function filterTree(tree: CloudProjectTree, query: string): CloudProjectTree {
  if (!query) {
    return tree;
  }

  const loweredQuery = query.toLowerCase();

  const filterFolders = (folders: CloudFolderTreeNode[]): CloudFolderTreeNode[] =>
    folders.flatMap((folder) => {
      const nextFolders = filterFolders(folder.folders);
      const nextFiles = folder.files.filter((file) => file.name.toLowerCase().includes(loweredQuery));
      const isMatch = folder.name.toLowerCase().includes(loweredQuery);

      if (!isMatch && nextFolders.length === 0 && nextFiles.length === 0) {
        return [];
      }

      return [
        {
          ...folder,
          folders: nextFolders,
          files: nextFiles,
        },
      ];
    });

  return {
    ...tree,
    folders: filterFolders(tree.folders),
    files: tree.files.filter((file) => file.name.toLowerCase().includes(loweredQuery)),
  };
}

export function isAuthError(error: { status?: number | null } | null | undefined) {
  return error?.status === 401 || error?.status === 403;
}

export function getCloudDropTargetKey(target: DropTarget | null) {
  if (!target) {
    return null;
  }

  return target.kind === "project"
    ? `project:${target.projectId}`
    : `folder:${target.projectId}:${target.folderId}`;
}

export function folderContainsDescendant(
  folder: CloudFolderTreeNode,
  targetFolderId: string,
): boolean {
  if (folder.id === targetFolderId) {
    return true;
  }

  return folder.folders.some((childFolder) => folderContainsDescendant(childFolder, targetFolderId));
}
