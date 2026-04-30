import type {
  CloudFolderTreeNode,
  CloudProjectTree,
  ProjectTreeItem,
} from "../../types/projects";

function appendFolderItems(
  items: ProjectTreeItem[],
  folder: CloudFolderTreeNode,
  level: number,
  expandedFolderIds: Set<string>,
) {
  const isExpanded = expandedFolderIds.has(folder.id);

  items.push({
    key: `folder:${folder.id}`,
    type: "folder",
    level,
    isExpanded,
    folder,
  });

  if (!isExpanded) {
    return;
  }

  folder.folders.forEach((childFolder) => appendFolderItems(items, childFolder, level + 1, expandedFolderIds));

  folder.files.forEach((file) => {
    items.push({
      key: `file:${file.id}`,
      type: "file",
      level: level + 1,
      file,
    });
  });
}

export function createInitialExpandedFolders(tree: CloudProjectTree) {
  return tree.folders.map((folder) => folder.id);
}

export function flattenProjectTree(tree: CloudProjectTree, expandedFolderIds: Set<string>) {
  const items: ProjectTreeItem[] = [];

  tree.folders.forEach((folder) => appendFolderItems(items, folder, 0, expandedFolderIds));
  tree.files.forEach((file) => {
    items.push({
      key: `file:${file.id}`,
      type: "file",
      level: 0,
      file,
    });
  });

  return items;
}
