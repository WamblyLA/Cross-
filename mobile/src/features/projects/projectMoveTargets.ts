import type { CloudFolderTreeNode, CloudProject, CloudProjectTree } from "../../types/projects";

export type ProjectFolderMoveTarget = {
  id: string | null;
  label: string;
  level: number;
};

function appendFolderTargets(
  targets: ProjectFolderMoveTarget[],
  folder: CloudFolderTreeNode,
  level: number,
) {
  targets.push({
    id: folder.id,
    label: folder.name,
    level,
  });

  folder.folders.forEach((childFolder) => appendFolderTargets(targets, childFolder, level + 1));
}

export function flattenProjectFolderTargets(tree: CloudProjectTree) {
  const targets: ProjectFolderMoveTarget[] = [
    {
      id: null,
      label: "Корень проекта",
      level: 0,
    },
  ];

  tree.folders.forEach((folder) => appendFolderTargets(targets, folder, 1));

  return targets;
}

export function getProjectMoveLabel(project: CloudProject) {
  return project.name;
}
