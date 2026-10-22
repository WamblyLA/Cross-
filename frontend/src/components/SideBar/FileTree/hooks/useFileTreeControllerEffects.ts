import { useEffect } from "react";
import {
  clearExplorerIntent,
  setExplorerSelectionSummary,
} from "../../../../features/workspace/workspaceSlice";
import type { useFileTreeControllerCore } from "./useFileTreeControllerCore";
import type { useFileTreeNodeActions } from "./useFileTreeNodeActions";

type FileTreeControllerCore = ReturnType<typeof useFileTreeControllerCore>;
type FileTreeNodeActions = ReturnType<typeof useFileTreeNodeActions>;

export function useFileTreeControllerEffects(
  core: FileTreeControllerCore,
  nodeActions: FileTreeNodeActions,
) {
  const { beginCreate, beginDelete, beginRename } = nodeActions;
  const {
    allPaths,
    anchorPath,
    clearDragDropState,
    clearHoverExpandTimer,
    dispatch,
    dragState,
    expandedPaths,
    explorerIntent,
    focusedPath,
    isDragDropEnabled,
    refreshGitState,
    refreshTree,
    rootPath,
    selectedPaths,
    setAnchorPath,
    setClipboard,
    setContextMenu,
    setDeleteTarget,
    setDraft,
    setError,
    setExpandedPaths,
    setFocusedPath,
    setGitState,
    setLoadingPath,
    setSelectedPaths,
    setTree,
    syncSelectionSummary,
  } = core;

  useEffect(() => clearHoverExpandTimer, [clearHoverExpandTimer]);

  useEffect(() => {
    if (!isDragDropEnabled && dragState) {
      clearDragDropState();
    }
  }, [clearDragDropState, dragState, isDragDropEnabled]);

  useEffect(() => {
    if (!rootPath) {
      setTree([]);
      setExpandedPaths([]);
      setSelectedPaths([]);
      setFocusedPath(null);
      setAnchorPath(null);
      setDraft(null);
      setDeleteTarget(null);
      setError(null);
      setLoadingPath(null);
      setContextMenu(null);
      setClipboard(null);
      setGitState({
        available: false,
        repositoryRootPath: null,
        statusesByRelativePath: {},
      });
      dispatch(
        setExplorerSelectionSummary({
          path: null,
          nodeType: null,
          count: 0,
        }),
      );
      return;
    }

    setExpandedPaths([]);
    setSelectedPaths([]);
    setFocusedPath(null);
    setAnchorPath(null);
    setDraft(null);
    setDeleteTarget(null);
    setContextMenu(null);
    void Promise.all([refreshTree([]), refreshGitState()]);
  }, [
    dispatch,
    refreshGitState,
    refreshTree,
    rootPath,
    setAnchorPath,
    setClipboard,
    setContextMenu,
    setDeleteTarget,
    setDraft,
    setError,
    setExpandedPaths,
    setFocusedPath,
    setGitState,
    setLoadingPath,
    setSelectedPaths,
    setTree,
  ]);

  useEffect(() => {
    if (!rootPath) {
      return;
    }

    let refreshTimerId: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimerId !== null) {
        window.clearTimeout(refreshTimerId);
      }

      refreshTimerId = window.setTimeout(() => {
        void Promise.all([refreshTree(expandedPaths), refreshGitState()]);
      }, 120);
    };

    const unsubscribe = window.electronAPI.onFolderChanged(() => {
      scheduleRefresh();
    });

    return () => {
      unsubscribe();

      if (refreshTimerId !== null) {
        window.clearTimeout(refreshTimerId);
      }
    };
  }, [expandedPaths, refreshGitState, refreshTree, rootPath]);

  useEffect(() => {
    const nextSelectedPaths = selectedPaths.filter((path) => allPaths.has(path));
    const nextFocusedPath =
      focusedPath && allPaths.has(focusedPath) ? focusedPath : null;
    const nextAnchorPath =
      anchorPath && allPaths.has(anchorPath) ? anchorPath : null;

    if (
      nextSelectedPaths.length !== selectedPaths.length ||
      nextFocusedPath !== focusedPath ||
      nextAnchorPath !== anchorPath
    ) {
      setSelectedPaths(nextSelectedPaths);
      setFocusedPath(nextFocusedPath);
      setAnchorPath(nextAnchorPath);
      syncSelectionSummary(nextSelectedPaths, nextFocusedPath);
    }
  }, [
    allPaths,
    anchorPath,
    focusedPath,
    selectedPaths,
    setAnchorPath,
    setFocusedPath,
    setSelectedPaths,
    syncSelectionSummary,
  ]);

  useEffect(() => {
    if (!explorerIntent) {
      return;
    }

    const executeIntent = async () => {
      switch (explorerIntent.type) {
        case "create-file":
          await beginCreate("file");
          break;
        case "create-folder":
          await beginCreate("folder");
          break;
        case "rename":
          beginRename();
          break;
        case "delete":
          beginDelete();
          break;
        case "refresh":
          await Promise.all([refreshTree(expandedPaths), refreshGitState()]);
          break;
        case "collapse-all":
          setExpandedPaths([]);
          setDraft(null);
          setDeleteTarget(null);
          await Promise.all([refreshTree([]), refreshGitState()]);
          break;
        default:
          break;
      }
    };

    void executeIntent().finally(() => {
      dispatch(clearExplorerIntent(explorerIntent.id));
    });
  }, [
    beginCreate,
    beginDelete,
    beginRename,
    dispatch,
    expandedPaths,
    explorerIntent,
    refreshGitState,
    refreshTree,
    setDeleteTarget,
    setDraft,
    setExpandedPaths,
  ]);
}
