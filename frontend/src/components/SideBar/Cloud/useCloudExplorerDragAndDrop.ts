import { useCallback, useEffect, type DragEvent } from "react";
import { createCloudSelectionEntry } from "../../../features/cloud/cloudSelection";
import type {
  CloudFileSummary,
  CloudFolderTreeNode,
} from "../../../features/cloud/cloudTypes";
import { normalizeApiError } from "../../../lib/api/errorNormalization";
import {
  findFolderNode,
  pruneNestedCloudSelection,
} from "./cloudExplorerSelection";
import type { DropTarget } from "./cloudExplorerTypes";
import { folderContainsDescendant, getCloudDropTargetKey } from "./cloudExplorerUtils";
import type { useCloudExplorerState } from "./useCloudExplorerState";

type CloudExplorerState = ReturnType<typeof useCloudExplorerState>;

export function useCloudExplorerDragAndDrop(state: CloudExplorerState) {
  const clearHoverOpenTimer = useCallback(() => {
    if (state.hoverOpenTimerRef.current !== null) {
      window.clearTimeout(state.hoverOpenTimerRef.current);
      state.hoverOpenTimerRef.current = null;
    }
  }, [state.hoverOpenTimerRef]);

  const clearDragDropState = useCallback(() => {
    clearHoverOpenTimer();
    state.setDragState(null);
    state.setDropTarget(null);
    state.setInvalidDropTargetKey(null);
  }, [clearHoverOpenTimer, state]);

  useEffect(() => clearHoverOpenTimer, [clearHoverOpenTimer]);

  useEffect(() => {
    if (!state.isDragDropEnabled && state.dragState) {
      clearDragDropState();
    }
  }, [clearDragDropState, state.dragState, state.isDragDropEnabled]);

  const canDropIntoTarget = useCallback(
    (target: DropTarget) => {
      if (!state.dragState) {
        return false;
      }

      const targetFolderId = target.kind === "folder" ? target.folderId : null;

      return state.dragState.items.every((item) => {
        if (item.itemType === "file") {
          return !(item.projectId === target.projectId && (item.folderId ?? null) === targetFolderId);
        }

        if (item.projectId === target.projectId && (item.parentId ?? null) === targetFolderId) {
          return false;
        }

        if (target.kind !== "folder" || item.projectId !== target.projectId) {
          return true;
        }

        const sourceTree = state.treeByProjectId[item.projectId];
        const sourceFolder = sourceTree ? findFolderNode(sourceTree.folders, item.folderId) : null;

        if (!sourceFolder) {
          return false;
        }

        return !folderContainsDescendant(sourceFolder, target.folderId);
      });
    },
    [state.dragState, state.treeByProjectId],
  );

  const scheduleTargetReveal = useCallback(
    (target: DropTarget) => {
      clearHoverOpenTimer();

      state.hoverOpenTimerRef.current = window.setTimeout(() => {
        if (target.kind === "project") {
          if (target.projectId !== state.activeProjectId) {
            void state.workspaceActions.openCloudProject(target.projectId);
            return;
          }

          state.setIsProjectExpanded(true);
          return;
        }

        if (target.projectId !== state.activeProjectId) {
          void state.workspaceActions.openCloudProject(target.projectId);
        }

        state.setIsProjectExpanded(true);
        state.setExpandedFolderIds((currentIds) =>
          currentIds.includes(target.folderId) ? currentIds : [...currentIds, target.folderId],
        );
      }, 450);
    },
    [clearHoverOpenTimer, state],
  );

  const performCloudDrop = useCallback(
    async (target: DropTarget) => {
      if (!state.dragState || !canDropIntoTarget(target)) {
        clearDragDropState();
        return;
      }

      state.resetMessages();
      state.setContextMenu(null);

      try {
        const prunedItems = state.activeProjectTree
          ? pruneNestedCloudSelection(state.dragState.items, state.activeProjectTree)
          : state.dragState.items;

        if (prunedItems.length === 1) {
          const [item] = prunedItems;

          if (item.itemType === "file") {
            await state.workspaceActions.moveCloudFile(
              item.projectId,
              item.fileId,
              target.projectId,
              target.kind === "folder" ? target.folderId : null,
            );
          } else {
            await state.workspaceActions.moveCloudFolder(
              item.projectId,
              item.folderId,
              target.projectId,
              target.kind === "folder" ? target.folderId : null,
            );
          }
        } else {
          await state.workspaceActions.moveCloudSelection(
            state.dragState.projectId,
            prunedItems,
            target.projectId,
            target.kind === "folder" ? target.folderId : null,
          );
        }

        state.setIsProjectExpanded(true);

        if (target.kind === "folder") {
          state.setExpandedFolderIds((currentIds) =>
            currentIds.includes(target.folderId) ? currentIds : [...currentIds, target.folderId],
          );
        }
      } catch (error) {
        state.setLocalError(normalizeApiError(error).message);
      } finally {
        clearDragDropState();
      }
    },
    [canDropIntoTarget, clearDragDropState, state],
  );

  const handleFolderDragStart = useCallback(
    (projectId: string, folder: CloudFolderTreeNode, event: DragEvent<HTMLElement>) => {
      if (!state.isDragDropEnabled) {
        event.preventDefault();
        return;
      }

      const item = createCloudSelectionEntry({
        itemType: "folder",
        projectId,
        folderId: folder.id,
        parentId: folder.parentId,
        name: folder.name,
      });
      const dragItems =
        state.selectedItemKeySet.has(item.key) &&
        state.selectedMovableItems.length === state.selectedItems.length
          ? state.selectedMovableItems
          : [item];

      if (!state.selectedItemKeySet.has(item.key)) {
        state.commitSelection([item], item.key, item.key);
      }

      state.setContextMenu(null);
      state.setDragState({
        kind: "folder",
        projectId,
        folderId: folder.id,
        parentId: folder.parentId,
        name: folder.name,
        items: dragItems,
      });
      state.setDropTarget(null);
      state.setInvalidDropTargetKey(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `folder:${folder.id}`);
    },
    [state],
  );

  const handleFileDragStart = useCallback(
    (projectId: string, file: CloudFileSummary, event: DragEvent<HTMLElement>) => {
      if (!state.isDragDropEnabled) {
        event.preventDefault();
        return;
      }

      const item = createCloudSelectionEntry({
        itemType: "file",
        projectId,
        fileId: file.id,
        folderId: file.folderId ?? null,
        name: file.name,
      });
      const dragItems =
        state.selectedItemKeySet.has(item.key) &&
        state.selectedMovableItems.length === state.selectedItems.length
          ? state.selectedMovableItems
          : [item];

      if (!state.selectedItemKeySet.has(item.key)) {
        state.commitSelection([item], item.key, item.key);
      }

      state.setContextMenu(null);
      state.setDragState({
        kind: "file",
        projectId,
        fileId: file.id,
        folderId: file.folderId,
        name: file.name,
        items: dragItems,
      });
      state.setDropTarget(null);
      state.setInvalidDropTargetKey(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `file:${file.id}`);
    },
    [state],
  );

  const handleCloudDragEnd = useCallback(() => {
    clearDragDropState();
  }, [clearDragDropState]);

  const handleProjectDragOver = useCallback(
    (projectId: string, event: DragEvent<HTMLElement>) => {
      if (!state.dragState || !state.isDragDropEnabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const target: DropTarget = { kind: "project", projectId };
      const validDrop = canDropIntoTarget(target);

      state.setDropTarget(validDrop ? target : null);
      state.setInvalidDropTargetKey(validDrop ? null : getCloudDropTargetKey(target));
      event.dataTransfer.dropEffect = validDrop ? "move" : "none";

      if (validDrop) {
        scheduleTargetReveal(target);
      } else {
        clearHoverOpenTimer();
      }
    },
    [canDropIntoTarget, clearHoverOpenTimer, scheduleTargetReveal, state],
  );

  const handleFolderDragOver = useCallback(
    (projectId: string, folderId: string, event: DragEvent<HTMLElement>) => {
      if (!state.dragState || !state.isDragDropEnabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const target: DropTarget = { kind: "folder", projectId, folderId };
      const validDrop = canDropIntoTarget(target);

      state.setDropTarget(validDrop ? target : null);
      state.setInvalidDropTargetKey(validDrop ? null : getCloudDropTargetKey(target));
      event.dataTransfer.dropEffect = validDrop ? "move" : "none";

      if (validDrop) {
        scheduleTargetReveal(target);
      } else {
        clearHoverOpenTimer();
      }
    },
    [canDropIntoTarget, clearHoverOpenTimer, scheduleTargetReveal, state],
  );

  const handleCloudDragLeave = useCallback(
    (target: DropTarget, event: DragEvent<HTMLElement>) => {
      event.stopPropagation();

      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      const targetKey = getCloudDropTargetKey(target);

      clearHoverOpenTimer();
      state.setDropTarget((currentTarget) =>
        getCloudDropTargetKey(currentTarget) === targetKey ? null : currentTarget,
      );
      state.setInvalidDropTargetKey((currentKey) => (currentKey === targetKey ? null : currentKey));
    },
    [clearHoverOpenTimer, state],
  );

  return {
    clearDragDropState,
    handleFolderDragStart,
    handleFileDragStart,
    handleCloudDragEnd,
    handleProjectDragOver,
    handleFolderDragOver,
    handleCloudDragLeave,
    handleProjectDrop: (projectId: string, event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      void performCloudDrop({ kind: "project", projectId });
    },
    handleFolderDrop: (projectId: string, folderId: string, event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      void performCloudDrop({ kind: "folder", projectId, folderId });
    },
  };
}
