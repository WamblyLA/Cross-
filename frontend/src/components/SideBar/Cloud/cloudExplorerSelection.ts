import {
  createCloudSelectionEntry,
  type CloudSelectionEntry,
} from "../../../features/cloud/cloudSelection";
import type {
  CloudFileSummary,
  CloudFolderTreeNode,
  CloudProjectTree,
} from "../../../features/cloud/cloudTypes";

export type CloudExplorerSelectionItem =
  | Extract<CloudSelectionEntry, { itemType: "folder" }>
  | Extract<CloudSelectionEntry, { itemType: "file" }>;

export function hasPrimaryModifier(
  event: Pick<MouseEvent, "ctrlKey" | "metaKey"> | Pick<KeyboardEvent, "ctrlKey" | "metaKey">,
) {
  return event.ctrlKey || event.metaKey;
}

export function findFolderNode(
  folders: CloudFolderTreeNode[],
  folderId: string,
): CloudFolderTreeNode | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder;
    }

    const nested = findFolderNode(folder.folders, folderId);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function findFileInTree(
  tree: CloudProjectTree,
  fileId: string,
): CloudFileSummary | null {
  const rootFile = tree.files.find((file) => file.id === fileId);

  if (rootFile) {
    return rootFile;
  }

  const visitFolders = (folders: CloudFolderTreeNode[]): CloudFileSummary | null => {
    for (const folder of folders) {
      const nestedFile = folder.files.find((file) => file.id === fileId);

      if (nestedFile) {
        return nestedFile;
      }

      const deepMatch = visitFolders(folder.folders);

      if (deepMatch) {
        return deepMatch;
      }
    }

    return null;
  };

  return visitFolders(tree.folders);
}

export function buildVisibleCloudSelectionItems(
  projectId: string,
  tree: CloudProjectTree,
  expandedFolderIds: string[],
): CloudExplorerSelectionItem[] {
  const expandedSet = new Set(expandedFolderIds);
  const items: CloudExplorerSelectionItem[] = [];

  const visitFolders = (folders: CloudFolderTreeNode[]) => {
    folders.forEach((folder) => {
      items.push(
        createCloudSelectionEntry({
          itemType: "folder",
          projectId,
          folderId: folder.id,
          parentId: folder.parentId,
          name: folder.name,
        }),
      );

      if (!expandedSet.has(folder.id)) {
        return;
      }

      visitFolders(folder.folders);
      folder.files.forEach((file) => {
        items.push(
          createCloudSelectionEntry({
            itemType: "file",
            projectId,
            fileId: file.id,
            folderId: file.folderId ?? null,
            name: file.name,
          }),
        );
      });
    });
  };

  visitFolders(tree.folders);
  tree.files.forEach((file) => {
    items.push(
      createCloudSelectionEntry({
        itemType: "file",
        projectId,
        fileId: file.id,
        folderId: file.folderId ?? null,
        name: file.name,
      }),
    );
  });

  return items;
}

export function pruneNestedCloudSelection(
  items: CloudExplorerSelectionItem[],
  tree: CloudProjectTree,
) {
  const selectedFolderIds = new Set(
    items.filter((item) => item.itemType === "folder").map((item) => item.folderId),
  );
  const folderParentMap = new Map<string, string | null>();

  const visitFolders = (folders: CloudFolderTreeNode[]) => {
    folders.forEach((folder) => {
      folderParentMap.set(folder.id, folder.parentId);
      visitFolders(folder.folders);
    });
  };

  visitFolders(tree.folders);

  const hasSelectedAncestorFolder = (folderId: string | null) => {
    let currentFolderId = folderId;

    while (currentFolderId) {
      if (selectedFolderIds.has(currentFolderId)) {
        return true;
      }

      currentFolderId = folderParentMap.get(currentFolderId) ?? null;
    }

    return false;
  };

  return items.filter((item) => {
    if (item.itemType === "folder") {
      return !hasSelectedAncestorFolder(folderParentMap.get(item.folderId) ?? null);
    }

    return !hasSelectedAncestorFolder(item.folderId);
  });
}
