import { useEffect } from "react";
import {
  clearExplorerIntent,
  setExplorerSelectionSummary,
} from "../../../features/workspace/workspaceSlice";
import type { useFileTreeControllerCore } from "./useFileTreeControllerCore";
import type { useFileTreeNodeActions } from "./useFileTreeNodeActions";

type FileTreeControllerCore = ReturnType<typeof useFileTreeControllerCore>;
type FileTreeNodeActions = ReturnType<typeof useFileTreeNodeActions>;

export function useFileTreeControllerEffects(
  core: FileTreeControllerCore,
  nodeActions: FileTreeNodeActions,
) {
  const { beginCreate, beginDelete, beginRename } = nodeActions;

  useEffect(() => core.clearHoverExpandTimer, [core.clearHoverExpandTimer]);

  useEffect(() => {
    if (!core.isDragDropEnabled && core.dragState) {
      core.clearDragDropState();
    }
  }, [core.clearDragDropState, core.dragState, core.isDragDropEnabled]);

  useEffect(() => {
    if (!core.rootPath) {
      core.setTree([]);
      core.setExpandedPaths([]);
      core.setSelectedPaths([]);
      core.setFocusedPath(null);
      core.setAnchorPath(null);
      core.setDraft(null);
      core.setDeleteTarget(null);
      core.setError(null);
      core.setLoadingPath(null);
      core.setContextMenu(null);
      core.setClipboard(null);
      core.setGitState({
        available: false,
        repositoryRootPath: null,
        statusesByRelativePath: {},
      });
      core.dispatch(
        setExplorerSelectionSummary({
          path: null,
          nodeType: null,
          count: 0,
        }),
      );
      return;
    }

    core.setExpandedPaths([]);
    core.setSelectedPaths([]);
    core.setFocusedPath(null);
    core.setAnchorPath(null);
    core.setDraft(null);
    core.setDeleteTarget(null);
    core.setContextMenu(null);
    void Promise.all([core.refreshTree([]), core.refreshGitState()]);
  }, [core.dispatch, core.refreshGitState, core.refreshTree, core.rootPath]);

  useEffect(() => {
    if (!core.rootPath) {
      return;
    }

    let refreshTimerId: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimerId !== null) {
        window.clearTimeout(refreshTimerId);
      }

      refreshTimerId = window.setTimeout(() => {
        void Promise.all([core.refreshTree(core.expandedPaths), core.refreshGitState()]);
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
  }, [core.expandedPaths, core.refreshGitState, core.refreshTree, core.rootPath]);

  useEffect(() => {
    const nextSelectedPaths = core.selectedPaths.filter((path) => core.allPaths.has(path));
    const nextFocusedPath =
      core.focusedPath && core.allPaths.has(core.focusedPath) ? core.focusedPath : null;
    const nextAnchorPath =
      core.anchorPath && core.allPaths.has(core.anchorPath) ? core.anchorPath : null;

    if (
      nextSelectedPaths.length !== core.selectedPaths.length ||
      nextFocusedPath !== core.focusedPath ||
      nextAnchorPath !== core.anchorPath
    ) {
      core.setSelectedPaths(nextSelectedPaths);
      core.setFocusedPath(nextFocusedPath);
      core.setAnchorPath(nextAnchorPath);
      core.syncSelectionSummary(nextSelectedPaths, nextFocusedPath);
    }
  }, [
    core.allPaths,
    core.anchorPath,
    core.focusedPath,
    core.selectedPaths,
    core.setAnchorPath,
    core.setFocusedPath,
    core.setSelectedPaths,
    core.syncSelectionSummary,
  ]);

  useEffect(() => {
    const explorerIntent = core.explorerIntent;

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
          await Promise.all([core.refreshTree(core.expandedPaths), core.refreshGitState()]);
          break;
        case "collapse-all":
          core.setExpandedPaths([]);
          core.setDraft(null);
          core.setDeleteTarget(null);
          await Promise.all([core.refreshTree([]), core.refreshGitState()]);
          break;
        default:
          break;
      }
    };

    void executeIntent().finally(() => {
      core.dispatch(clearExplorerIntent(explorerIntent.id));
    });
  }, [
    core.dispatch,
    core.expandedPaths,
    core.explorerIntent,
    core.refreshTree,
    core.setDeleteTarget,
    core.setDraft,
    core.setExpandedPaths,
  ]);
}
