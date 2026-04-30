import { useCallback, type DragEvent } from "react";
import { renameFilePath } from "../../../features/files/filesSlice";
import { FILE_TREE_HOVER_EXPAND_DELAY_MS } from "./fileTreeConstants";
import {
  canDropIntoDirectory,
  computeNextExpandedAfterMove,
  normalizeDraggedPaths,
  resolveDropDirectory,
} from "./fileTreeDnd";
import type { WorkspaceTreeNode } from "./fileTreeTypes";
import { getDropTargetKey } from "./fileTreeUtils";
import type { useFileTreeControllerCore } from "./useFileTreeControllerCore";

type FileTreeControllerCore = ReturnType<typeof useFileTreeControllerCore>;

export function useFileTreeDragAndDrop(core: FileTreeControllerCore) {
  const scheduleFolderAutoExpand = useCallback(
    (folderPath: string) => {
      core.clearHoverExpandTimer();

      if (core.expandedSet.has(folderPath)) {
        return;
      }

      core.hoverExpandTimerRef.current = window.setTimeout(() => {
        void core.ensureFolderVisible(folderPath);
      }, FILE_TREE_HOVER_EXPAND_DELAY_MS);
    },
    [core],
  );

  const performDragMove = useCallback(
    async (target: { kind: "root" } | { kind: "folder"; path: string }) => {
      if (!core.dragState) {
        return;
      }

      const targetDirectory = resolveDropDirectory(core.rootPath, target, core.nodeByPath);

      if (!canDropIntoDirectory(core.dragState.paths, targetDirectory, core.rootPath) || !targetDirectory) {
        core.clearDragDropState();
        return;
      }

      try {
        const result = await window.electronAPI.moveFileSystemItems(core.dragState.paths, targetDirectory);
        const nextExpandedPaths = computeNextExpandedAfterMove(
          core.expandedPaths,
          core.dragState.paths,
          result.paths,
          targetDirectory,
          core.rootPath,
        );

        core.dragState.paths.forEach((sourcePath, index) => {
          const nextPath = result.paths[index];

          if (nextPath && nextPath !== sourcePath) {
            core.dispatch(
              renameFilePath({
                oldPath: sourcePath,
                newPath: nextPath,
              }),
            );
          }
        });

        core.setExpandedPaths(nextExpandedPaths);
        await core.refreshTree(nextExpandedPaths);
        core.commitSelection(result.paths, result.paths[0] ?? null, result.paths[0] ?? null);
      } catch (moveError) {
        console.error("Ошибка при переносе элементов", moveError);
        core.setError(
          moveError instanceof Error
            ? moveError.message
            : "Не удалось переместить выбранные элементы.",
        );
      } finally {
        core.clearDragDropState();
      }
    },
    [core],
  );

  const handleNodeDragStart = useCallback(
    (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => {
      if (!core.isDragDropEnabled) {
        event.preventDefault();
        return;
      }

      const nextSelection = core.selectedSet.has(node.path) ? core.selectedPaths : [node.path];
      const dragPaths = normalizeDraggedPaths(nextSelection, core.rootPath);

      if (dragPaths.length === 0) {
        event.preventDefault();
        return;
      }

      if (!core.selectedSet.has(node.path)) {
        core.commitSelection([node.path], node.path, node.path);
      }

      core.focusExplorer();
      core.setContextMenu(null);
      core.setDraft(null);
      core.setDeleteTarget(null);
      core.setDragState({ paths: dragPaths });
      core.setDropTarget(null);
      core.setInvalidDropTargetKey(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", node.path);
    },
    [core],
  );

  const handleNodeDragEnd = useCallback(() => {
    core.clearDragDropState();
  }, [core]);

  const handleNodeDragOver = useCallback(
    (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => {
      if (!core.dragState || !core.isDragDropEnabled || node.type !== "folder") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nextTarget = { kind: "folder" as const, path: node.path };
      const targetDirectory = resolveDropDirectory(core.rootPath, nextTarget, core.nodeByPath);
      const validDrop = canDropIntoDirectory(core.dragState.paths, targetDirectory, core.rootPath);

      core.setDropTarget(validDrop ? nextTarget : null);
      core.setInvalidDropTargetKey(validDrop ? null : getDropTargetKey(nextTarget));
      event.dataTransfer.dropEffect = validDrop ? "move" : "none";

      if (validDrop) {
        scheduleFolderAutoExpand(node.path);
      } else {
        core.clearHoverExpandTimer();
      }
    },
    [core, scheduleFolderAutoExpand],
  );

  const handleNodeDragLeave = useCallback(
    (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      const targetKey = getDropTargetKey({ kind: "folder", path: node.path });

      core.clearHoverExpandTimer();
      core.setDropTarget((currentTarget) =>
        getDropTargetKey(currentTarget) === targetKey ? null : currentTarget,
      );
      core.setInvalidDropTargetKey((currentKey) => (currentKey === targetKey ? null : currentKey));
    },
    [core],
  );

  const handleNodeDrop = useCallback(
    (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => {
      if (node.type !== "folder") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void performDragMove({ kind: "folder", path: node.path });
    },
    [performDragMove],
  );

  const handleRootDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (
        !core.dragState ||
        !core.isDragDropEnabled ||
        (event.target as HTMLElement).closest("[data-tree-node='true']")
      ) {
        return;
      }

      const nextTarget = { kind: "root" as const };
      const targetDirectory = resolveDropDirectory(core.rootPath, nextTarget, core.nodeByPath);
      const validDrop = canDropIntoDirectory(core.dragState.paths, targetDirectory, core.rootPath);

      if (!validDrop) {
        return;
      }

      event.preventDefault();
      core.setDropTarget(nextTarget);
      core.setInvalidDropTargetKey(null);
      event.dataTransfer.dropEffect = "move";
    },
    [core],
  );

  const handleRootDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      core.clearHoverExpandTimer();
      core.setDropTarget((currentTarget) => (currentTarget?.kind === "root" ? null : currentTarget));
      core.setInvalidDropTargetKey(null);
    },
    [core],
  );

  const handleRootDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!core.dragState || (event.target as HTMLElement).closest("[data-tree-node='true']")) {
        return;
      }

      event.preventDefault();
      void performDragMove({ kind: "root" });
    },
    [core.dragState, performDragMove],
  );

  return {
    handleNodeDragStart,
    handleNodeDragEnd,
    handleNodeDragOver,
    handleNodeDragLeave,
    handleNodeDrop,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
  };
}
