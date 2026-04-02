import { useFileTreeClipboard } from "./useFileTreeClipboard";
import { useFileTreeControllerCore } from "./useFileTreeControllerCore";
import { useFileTreeControllerEffects } from "./useFileTreeControllerEffects";
import { useFileTreeDragAndDrop } from "./useFileTreeDragAndDrop";
import { useFileTreeDraftActions } from "./useFileTreeDraftActions";
import { useFileTreeInteractionHandlers } from "./useFileTreeInteractionHandlers";
import { useFileTreeNodeActions } from "./useFileTreeNodeActions";

export function useFileTreeController() {
  const core = useFileTreeControllerCore();
  const nodeActions = useFileTreeNodeActions(core);
  const draftActions = useFileTreeDraftActions(core);
  const clipboardActions = useFileTreeClipboard(core);
  const dragAndDrop = useFileTreeDragAndDrop(core);
  const interactionHandlers = useFileTreeInteractionHandlers(
    core,
    nodeActions,
    draftActions,
    clipboardActions,
  );

  useFileTreeControllerEffects(core, nodeActions);

  return {
    rootPath: core.rootPath,
    containerRef: core.containerRef,
    error: core.error,
    isLoading: core.isLoading,
    trimmedSearchQuery: core.trimmedSearchQuery,
    draft: core.draft,
    deleteTarget: core.deleteTarget,
    contextMenu: core.contextMenu,
    dropTarget: core.dropTarget,
    invalidDropTargetKey: core.invalidDropTargetKey,
    expandedSet: core.expandedSet,
    selectedSet: core.selectedSet,
    focusedPath: core.focusedPath,
    draggedPathSet: core.draggedPathSet,
    isDragDropEnabled: core.isDragDropEnabled,
    visibleRows: core.visibleRows,
    hasAnyNodes: core.hasAnyNodes,
    hasVisibleNodes: core.hasVisibleNodes,
    contextMenuSections: interactionHandlers.contextMenuSections,
    setContextMenu: core.setContextMenu,
    setDeleteTarget: core.setDeleteTarget,
    confirmDelete: draftActions.confirmDelete,
    focusExplorer: core.focusExplorer,
    setDraftValue: draftActions.setDraftValue,
    cancelDraft: draftActions.cancelDraft,
    handleDraftSubmit: draftActions.handleDraftSubmit,
    handleNodeDoubleClick: nodeActions.handleNodeDoubleClick,
    handleNodeContextMenu: interactionHandlers.handleNodeContextMenu,
    handleNodeDragEnd: dragAndDrop.handleNodeDragEnd,
    handleNodeDragLeave: dragAndDrop.handleNodeDragLeave,
    handleNodeDragOver: dragAndDrop.handleNodeDragOver,
    handleNodeDragStart: dragAndDrop.handleNodeDragStart,
    handleNodeDrop: dragAndDrop.handleNodeDrop,
    handleOpenFile: nodeActions.handleOpenFile,
    handleRootContextMenu: interactionHandlers.handleRootContextMenu,
    handleRootDragLeave: dragAndDrop.handleRootDragLeave,
    handleRootDragOver: dragAndDrop.handleRootDragOver,
    handleRootDrop: dragAndDrop.handleRootDrop,
    handleSelectNode: nodeActions.handleSelectNode,
    handleToggleFolder: nodeActions.handleToggleFolder,
    handleTreeKeyDown: interactionHandlers.handleTreeKeyDown,
    handleContainerMouseDown: interactionHandlers.handleContainerMouseDown,
  };
}
