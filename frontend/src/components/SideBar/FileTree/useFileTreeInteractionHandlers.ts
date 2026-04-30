import { useCallback, useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { useLinkedWorkspaceActions } from "../../../hooks/useLinkedWorkspaceActions";
import { buildFileTreeContextMenuSections } from "./fileTreeMenuSections";
import {
  moveSelectionByOffset,
  selectAllVisible,
} from "./fileTreeKeyboard";
import { hasPrimaryModifier } from "./fileTreeUtils";
import type { useFileTreeClipboard } from "./useFileTreeClipboard";
import type { useFileTreeControllerCore } from "./useFileTreeControllerCore";
import type { useFileTreeDraftActions } from "./useFileTreeDraftActions";
import type { useFileTreeNodeActions } from "./useFileTreeNodeActions";
import type { WorkspaceTreeNode } from "./fileTreeTypes";

type FileTreeControllerCore = ReturnType<typeof useFileTreeControllerCore>;
type FileTreeNodeActions = ReturnType<typeof useFileTreeNodeActions>;
type FileTreeDraftActions = ReturnType<typeof useFileTreeDraftActions>;
type FileTreeClipboard = ReturnType<typeof useFileTreeClipboard>;

export function useFileTreeInteractionHandlers(
  core: FileTreeControllerCore,
  nodeActions: FileTreeNodeActions,
  draftActions: FileTreeDraftActions,
  clipboardActions: FileTreeClipboard,
) {
  const { activeBinding, openSyncPreview } = useLinkedWorkspaceActions();

  const handleLinkedFileSyncPreview = useCallback(
    async (direction: "push" | "pull", relativePath: string) => {
      if (!activeBinding || !relativePath) {
        return;
      }

      await openSyncPreview(activeBinding, direction, "file", relativePath);
    },
    [activeBinding, openSyncPreview],
  );

  const handleNodeContextMenu = useCallback(
    (node: WorkspaceTreeNode, event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      core.focusExplorer();
      core.setDraft(null);
      core.setDeleteTarget(null);

      const nextSelection = core.selectedSet.has(node.path) ? core.selectedPaths : [node.path];
      core.commitSelection(nextSelection, node.path, core.anchorPath ?? node.path);
      core.setContextMenu({
        kind: "selection",
        x: event.clientX,
        y: event.clientY,
        paths: nextSelection,
        primaryPath: node.path,
      });
    },
    [core],
  );

  const handleRootContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("[data-tree-node='true']")) {
        return;
      }

      event.preventDefault();
      core.focusExplorer();
      core.commitSelection([], null, null);
      core.setContextMenu({
        kind: "root",
        x: event.clientX,
        y: event.clientY,
      });
    },
    [core],
  );

  const handleKeyboardSelectionMove = useCallback(
    (direction: -1 | 1, extendSelection: boolean) => {
      const nextSelection = moveSelectionByOffset({
        visiblePaths: core.visibleNodePaths,
        selectedPaths: core.selectedPaths,
        focusedPath: core.focusedPath,
        anchorPath: core.anchorPath,
        direction,
        extendSelection,
      });

      if (!nextSelection) {
        return;
      }

      core.commitSelection(
        nextSelection.selectedPaths,
        nextSelection.focusedPath,
        nextSelection.anchorPath,
      );
    },
    [core],
  );

  const handleTreeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target instanceof HTMLInputElement) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        handleKeyboardSelectionMove(1, event.shiftKey);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        handleKeyboardSelectionMove(-1, event.shiftKey);
        return;
      }

      if (event.key === "Enter") {
        const primaryNode = core.currentPrimarySelectionPath
          ? core.nodeByPath.get(core.currentPrimarySelectionPath) ?? null
          : null;

        if (!primaryNode) {
          return;
        }

        event.preventDefault();

        if (primaryNode.type === "folder") {
          void nodeActions.handleToggleFolder(primaryNode);
        } else {
          void nodeActions.handleOpenFile(primaryNode);
        }

        return;
      }

      if (event.key === "Delete") {
        if (core.selectedPaths.length === 0) {
          return;
        }

        event.preventDefault();
        nodeActions.beginDelete();
        return;
      }

      if (event.key === "F2") {
        if (core.selectedPaths.length !== 1) {
          return;
        }

        event.preventDefault();
        nodeActions.beginRename();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        core.setContextMenu(null);
        core.setDeleteTarget(null);
        core.setDraft(null);
        return;
      }

      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        const nextSelection = selectAllVisible(core.visibleNodePaths);
        core.commitSelection(nextSelection.selectedPaths, nextSelection.focusedPath, nextSelection.anchorPath);
        return;
      }

      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "c") {
        if (core.selectedPaths.length === 0) {
          return;
        }

        event.preventDefault();
        clipboardActions.copySelectionToClipboard("copy");
        return;
      }

      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "x") {
        if (core.selectedPaths.length === 0) {
          return;
        }

        event.preventDefault();
        clipboardActions.copySelectionToClipboard("cut");
        return;
      }

      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "v") {
        if (!core.clipboard) {
          return;
        }

        event.preventDefault();
        void clipboardActions.handlePaste();
      }
    },
    [clipboardActions, core, handleKeyboardSelectionMove, nodeActions],
  );

  const handleContainerMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("[data-tree-node='true']")) {
        return;
      }

      core.focusExplorer();
      core.commitSelection([], null, null);
      core.setContextMenu(null);
    },
    [core],
  );

  const contextMenuSections = useMemo(
    () =>
      buildFileTreeContextMenuSections({
        contextMenu: core.contextMenu,
        rootPath: core.rootPath,
        clipboard: core.clipboard,
        nodeByPath: core.nodeByPath,
        beginCreate: nodeActions.beginCreate,
        beginRename: nodeActions.beginRename,
        beginDelete: nodeActions.beginDelete,
        handleOpenFile: nodeActions.handleOpenFile,
        handlePaste: clipboardActions.handlePaste,
        handleLinkedFileSyncPreview,
        linkedRootPath: activeBinding?.localRootPath ?? null,
        refreshTree: core.refreshTree,
        copySelectionToClipboard: clipboardActions.copySelectionToClipboard,
        expandedPaths: core.expandedPaths,
      }),
    [activeBinding?.localRootPath, clipboardActions, core, handleLinkedFileSyncPreview, nodeActions],
  );

  void draftActions;

  return {
    handleNodeContextMenu,
    handleRootContextMenu,
    handleTreeKeyDown,
    handleContainerMouseDown,
    contextMenuSections,
  };
}
