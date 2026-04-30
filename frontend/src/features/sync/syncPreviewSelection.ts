import type { SyncPlanItem, SyncPreview, SyncPreviewSummary } from "./syncTypes";

export function getSyncPreviewItemKey(item: Pick<SyncPlanItem, "kind" | "action" | "relativePath">) {
  return `${item.kind}:${item.action ?? "none"}:${item.relativePath}`;
}

export function isSyncPreviewItemActionable(item: SyncPlanItem) {
  return item.action !== null && !item.blockedByDirtyTab;
}

function isSameOrDescendantPath(parentPath: string, candidatePath: string) {
  if (!parentPath) {
    return true;
  }

  return candidatePath === parentPath || candidatePath.startsWith(`${parentPath}/`);
}

function buildFolderCreateMap(preview: SyncPreview) {
  return new Map(
    preview.items
      .filter(
        (item) =>
          item.kind === "folder" &&
          item.action === "create" &&
          !item.blockedByDirtyTab,
      )
      .map((item) => [item.relativePath, item]),
  );
}

function removeSelectedAncestorFolders(
  preview: SyncPreview,
  selection: Set<string>,
  relativePath: string,
) {
  const nextSelection = new Set(selection);

  for (const item of preview.items) {
    if (item.kind !== "folder" || !isSyncPreviewItemActionable(item)) {
      continue;
    }

    const itemKey = getSyncPreviewItemKey(item);

    if (!nextSelection.has(itemKey)) {
      continue;
    }

    if (
      item.relativePath &&
      item.relativePath !== relativePath &&
      isSameOrDescendantPath(item.relativePath, relativePath)
    ) {
      nextSelection.delete(itemKey);
    }
  }

  return nextSelection;
}

function withParentCreateDependencies(preview: SyncPreview, selection: Set<string>) {
  const nextSelection = new Set(selection);
  const folderCreateByPath = buildFolderCreateMap(preview);

  for (const item of preview.items) {
    const itemKey = getSyncPreviewItemKey(item);

    if (!nextSelection.has(itemKey)) {
      continue;
    }

    const segments = item.relativePath.split("/").filter(Boolean);

    for (let index = 1; index < segments.length; index += 1) {
      const parentRelativePath = segments.slice(0, index).join("/");
      const parentItem = folderCreateByPath.get(parentRelativePath);

      if (parentItem) {
        nextSelection.add(getSyncPreviewItemKey(parentItem));
      }
    }
  }

  return nextSelection;
}

export function toggleSyncPreviewItemSelection(
  preview: SyncPreview,
  currentSelection: Set<string>,
  targetItemKey: string,
  isSelected: boolean,
) {
  const targetItem = preview.items.find((item) => getSyncPreviewItemKey(item) === targetItemKey);

  if (!targetItem || !isSyncPreviewItemActionable(targetItem)) {
    return currentSelection;
  }

  const nextSelection = new Set(currentSelection);
  const affectedKeys =
    targetItem.kind === "folder"
      ? preview.items
          .filter(
            (item) =>
              isSyncPreviewItemActionable(item) &&
              isSameOrDescendantPath(targetItem.relativePath, item.relativePath),
          )
          .map((item) => getSyncPreviewItemKey(item))
      : [targetItemKey];

  for (const itemKey of affectedKeys) {
    if (isSelected) {
      nextSelection.add(itemKey);
    } else {
      nextSelection.delete(itemKey);
    }
  }

  if (!isSelected) {
    return withParentCreateDependencies(
      preview,
      removeSelectedAncestorFolders(preview, nextSelection, targetItem.relativePath),
    );
  }

  return withParentCreateDependencies(preview, nextSelection);
}

export function selectAllActionableItems(preview: SyncPreview) {
  return new Set(
    preview.items
      .filter((item) => isSyncPreviewItemActionable(item))
      .map((item) => getSyncPreviewItemKey(item)),
  );
}

export function getSelectedSyncPreviewItems(preview: SyncPreview, selectedItemKeys: Set<string>) {
  return preview.items.filter((item) => selectedItemKeys.has(getSyncPreviewItemKey(item)));
}

export function summarizeSyncPreviewItems(items: SyncPlanItem[]): SyncPreviewSummary & { totalCount: number } {
  return items.reduce(
    (summary, item) => {
      if (item.action === "create") {
        summary.createCount += 1;
      } else if (item.action === "update") {
        summary.updateCount += 1;
      } else if (item.action === "delete") {
        summary.deleteCount += 1;
      }

      if (item.blockedByDirtyTab) {
        summary.blockedCount += 1;
      }

      summary.totalCount += 1;
      return summary;
    },
    {
      createCount: 0,
      updateCount: 0,
      deleteCount: 0,
      blockedCount: 0,
      totalCount: 0,
    },
  );
}
