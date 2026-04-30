import { useCallback, useEffect, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from "react";
import { clearCloudSelection, selectCloudItem } from "../../../features/cloud/cloudSlice";
import { createCloudSelectionEntry } from "../../../features/cloud/cloudSelection";
import { clearExplorerIntent } from "../../../features/workspace/workspaceSlice";
import { normalizeApiError } from "../../../lib/api/errorNormalization";
import type { CloudFileSummary, CloudFolderTreeNode, CloudProject } from "../../../features/cloud/cloudTypes";
import { findFileInTree, findFolderNode, pruneNestedCloudSelection, type CloudExplorerSelectionItem } from "./cloudExplorerSelection";
import { moveCloudSelectionByOffset } from "./cloudExplorerKeyboard";
import type { useCloudExplorerCreateRename } from "./useCloudExplorerCreateRename";
import type { useCloudExplorerState } from "./useCloudExplorerState";

type CloudExplorerState = ReturnType<typeof useCloudExplorerState>;
type CloudExplorerCreateRename = ReturnType<typeof useCloudExplorerCreateRename>;
export function useCloudExplorerInteractionEffects(
  state: CloudExplorerState,
  createRename: CloudExplorerCreateRename,
) {
  const handleDeleteConfirm = useCallback(async () => {
    if (!state.deleteTarget) {
      return;
    }
    state.resetMessages();
    try {
      if (state.deleteTarget.kind === "project") {
        await state.workspaceActions.deleteCloudProject(state.deleteTarget.projectId);
      } else if (state.deleteTarget.kind === "selection") {
        await state.workspaceActions.deleteCloudSelection(state.deleteTarget.projectId, state.deleteTarget.items);
      } else if (state.deleteTarget.kind === "folder") {
        await state.workspaceActions.deleteCloudFolder(state.deleteTarget.projectId, state.deleteTarget.folderId);
      } else {
        await state.workspaceActions.deleteCloudFile(state.deleteTarget.projectId, state.deleteTarget.fileId);
      }

      state.setDeleteTarget(null);
    } catch (error) {
      state.setLocalError(normalizeApiError(error).message);
    }
  }, [state]);

  useEffect(() => {
    const explorerIntent = state.explorerIntent;
    if (!explorerIntent) {
      return;
    }
    const executeIntent = async () => {
      if (!state.isAuthenticated) {
        if (explorerIntent.type === "refresh") {
          return;
        }
        state.setLocalError("Войдите в аккаунт, чтобы работать с облачными проектами.");
        return;
      }

      switch (explorerIntent.type) {
        case "create-project":
          createRename.beginProjectCreate();
          return;
        case "create-file":
          await createRename.beginFileCreate();
          return;
        case "create-folder":
          await createRename.beginFolderCreate();
          return;
        case "rename":
          if (state.selectedItemCount !== 1) {
            return;
          }

          if (state.selectedItemType === "project" && state.selectedProjectId) {
            const project = state.projects.find((item) => item.id === state.selectedProjectId);
            if (project) {
              createRename.beginProjectRename(project.id, project.name);
            }
          } else if (
            state.selectedItemType === "folder" &&
            state.activeProjectId &&
            state.selectedFolderId &&
            state.activeProjectTree
          ) {
            const folder = findFolderNode(state.activeProjectTree.folders, state.selectedFolderId);
            if (folder) {
              createRename.beginFolderRename(state.activeProjectId, folder.id, folder.parentId, folder.name);
            }
          } else if (state.selectedItemType === "file" && state.activeProjectId && state.selectedFileId) {
            const selectedFile = state.activeProjectTree
              ? findFileInTree(state.activeProjectTree, state.selectedFileId)
              : null;
            if (selectedFile) {
              createRename.beginFileRename(
                state.activeProjectId,
                selectedFile.id,
                selectedFile.folderId,
                selectedFile.name,
              );
            }
          }
          return;
        case "delete":
          if (state.selectedItemType === "project" && state.selectedProjectId) {
            const project = state.projects.find((item) => item.id === state.selectedProjectId);
            if (project) {
              createRename.beginProjectDelete(project.id, project.name);
            }
          } else if (
            state.selectedItemCount > 1 &&
            state.activeProjectId &&
            state.selectedMovableItems.length === state.selectedItems.length
          ) {
            createRename.beginSelectionDelete(
              pruneNestedCloudSelection(
                state.selectedMovableItems,
                state.activeProjectTree ?? { projectId: state.activeProjectId, folders: [], files: [] },
              ),
            );
          } else if (
            state.selectedItemType === "folder" &&
            state.activeProjectId &&
            state.selectedFolderId &&
            state.activeProjectTree
          ) {
            const folder = findFolderNode(state.activeProjectTree.folders, state.selectedFolderId);
            if (folder) {
              createRename.beginFolderDelete(state.activeProjectId, folder.id, folder.name);
            }
          } else if (
            state.selectedItemType === "file" &&
            state.activeProjectId &&
            state.selectedFileId &&
            state.activeProjectTree
          ) {
            const targetFile = findFileInTree(state.activeProjectTree, state.selectedFileId);
            if (targetFile) {
              createRename.beginFileDelete(state.activeProjectId, targetFile.id, targetFile.name);
            }
          }
          return;
        case "refresh":
          await state.handleRefresh();
          return;
        case "collapse-all":
          state.setIsProjectExpanded(false);
          state.setExpandedFolderIds([]);
          return;
        default:
          return;
      }
    };

    void executeIntent().finally(() => {
      state.dispatch(clearExplorerIntent(explorerIntent.id));
    });
  }, [state.explorerIntent]);

  const handleProjectContextMenu = useCallback(
    (project: CloudProject, event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      state.dispatch(selectCloudItem({ projectId: project.id, folderId: null, fileId: null, itemType: "project" }));
      state.setContextMenu({ kind: "project", project, x: event.clientX, y: event.clientY });
    },
    [state],
  );

  const handleFolderContextMenu = useCallback(
    (projectId: string, folder: CloudFolderTreeNode, event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const item = createCloudSelectionEntry({
        itemType: "folder",
        projectId,
        folderId: folder.id,
        parentId: folder.parentId,
        name: folder.name,
      });

      if (!state.selectedItemKeySet.has(item.key)) {
        state.commitSelection([item], item.key, item.key);
      }
      state.setContextMenu({
        kind: "folder",
        projectId,
        folder,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [state],
  );

  const handleFileContextMenu = useCallback(
    (projectId: string, file: CloudFileSummary, event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const item = createCloudSelectionEntry({
        itemType: "file",
        projectId,
        fileId: file.id,
        folderId: file.folderId ?? null,
        name: file.name,
      });

      if (!state.selectedItemKeySet.has(item.key)) {
        state.commitSelection([item], item.key, item.key);
      }
      state.setContextMenu({ kind: "file", projectId, file, x: event.clientX, y: event.clientY });
    },
    [state],
  );

  const handleRootContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-cloud-node='true']")) {
      return;
    }
    event.preventDefault();
    state.dispatch(clearCloudSelection());
    state.setContextMenu({ kind: "root", x: event.clientX, y: event.clientY });
  }, [state]);

  const handleKeyboardSelectionMove = useCallback(
    (delta: number, extendSelection: boolean) => {
      const nextSelection = moveCloudSelectionByOffset({
        visibleItems: state.visibleSelectionItems,
        focusedItemKey: state.focusedItemKey,
        selectedItemKeys: state.selectedItemKeys,
        selectionAnchorKey: state.selectionAnchorKey,
        delta,
        extendSelection,
      });

      if (!nextSelection) {
        return;
      }
      state.commitSelection(nextSelection.items, nextSelection.focusedItemKey, nextSelection.selectionAnchorKey);
    },
    [state],
  );

  const handleExplorerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable='true'], button[data-cloud-inline-input]")) {
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

      if (event.key === "Delete") {
        if (state.selectedItemCount === 0) {
          return;
        }
        event.preventDefault();

        if (state.selectedItemCount > 1 && state.activeProjectTree) {
          createRename.beginSelectionDelete(
            pruneNestedCloudSelection(
              state.selectedItems.filter(
                (item): item is CloudExplorerSelectionItem =>
                  item.itemType === "folder" || item.itemType === "file",
              ),
              state.activeProjectTree,
            ),
          );
          return;
        }

        if (state.selectedItemType === "project" && state.selectedProjectId) {
          const project = state.projects.find((item) => item.id === state.selectedProjectId);
          if (project) {
            createRename.beginProjectDelete(project.id, project.name);
          }
          return;
        }

        if (state.selectedItemType === "folder" && state.activeProjectId && state.selectedFolderId && state.activeProjectTree) {
          const folder = findFolderNode(state.activeProjectTree.folders, state.selectedFolderId);
          if (folder) {
            createRename.beginFolderDelete(state.activeProjectId, folder.id, folder.name);
          }
          return;
        }

        if (state.selectedItemType === "file" && state.activeProjectId && state.selectedFileId && state.activeProjectTree) {
          const file = findFileInTree(state.activeProjectTree, state.selectedFileId);
          if (file) {
            createRename.beginFileDelete(state.activeProjectId, file.id, file.name);
          }
        }
        return;
      }

      if (event.key === "Enter" && state.selectedItemCount === 1 && state.selectedItemType === "file" && state.selectedProjectId && state.selectedFileId) {
        event.preventDefault();
        void state.handleOpenFile(state.selectedProjectId, state.selectedFileId);
      }
    },
    [createRename, handleKeyboardSelectionMove, state],
  );

  return {
    handleDeleteConfirm,
    handleProjectContextMenu,
    handleFolderContextMenu,
    handleFileContextMenu,
    handleRootContextMenu,
    handleExplorerKeyDown,
  };
}
