import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { selectIsAuthenticated } from "../../../features/auth/authSelectors";
import {
  clearFileActionError,
  clearFolderActionError,
  clearProjectActionError,
  clearProjectsError,
  setCloudSelection,
  selectCloudItem,
} from "../../../features/cloud/cloudSlice";
import {
  selectCloudActiveProjectId,
  selectCloudFilesError,
  selectCloudFilesStatus,
  selectCloudFileActionError,
  selectCloudFolderActionError,
  selectCloudProjects,
  selectCloudProjectsError,
  selectCloudProjectsStatus,
  selectCloudProjectActionError,
  selectCloudSelectedItemCount,
  selectCloudSelectedItemKeys,
  selectCloudSelectedItems,
  selectCloudSelectedFileId,
  selectCloudSelectedFolderId,
  selectCloudFocusedItemKey,
  selectCloudSelectedItemType,
  selectCloudSelectedProjectId,
  selectCloudSelectionAnchorKey,
  selectCloudTreeForProject,
} from "../../../features/cloud/cloudSelectors";
import type { CloudSelectionEntry } from "../../../features/cloud/cloudSelection";
import { normalizeApiError } from "../../../lib/api/errorNormalization";
import { useWorkspaceActions } from "../../../hooks/useWorkspaceActions";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  buildVisibleCloudSelectionItems,
  hasPrimaryModifier,
  type CloudExplorerSelectionItem,
} from "./cloudExplorerSelection";
import type {
  ContextMenuState,
  DeleteTarget,
  DraftState,
  DragState,
  DropTarget,
} from "./cloudExplorerTypes";
import { filterTree, isAuthError } from "./cloudExplorerUtils";

export function useCloudExplorerState() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const searchQuery = useAppSelector((state) => state.workspace.searchQuery.trim());
  const explorerIntent = useAppSelector((state) => state.workspace.explorerIntent);
  const projects = useAppSelector(selectCloudProjects);
  const projectsStatus = useAppSelector(selectCloudProjectsStatus);
  const projectsError = useAppSelector(selectCloudProjectsError);
  const activeProjectId = useAppSelector(selectCloudActiveProjectId);
  const activeProjectTree = useAppSelector((state) => selectCloudTreeForProject(state, activeProjectId));
  const activeProjectFilesStatus = useAppSelector((state) => selectCloudFilesStatus(state, activeProjectId));
  const activeProjectFilesError = useAppSelector((state) => selectCloudFilesError(state, activeProjectId));
  const treeByProjectId = useAppSelector((state) => state.cloud.treeByProjectId);
  const selectedItemKeys = useAppSelector(selectCloudSelectedItemKeys);
  const selectedItems = useAppSelector(selectCloudSelectedItems);
  const selectedItemCount = useAppSelector(selectCloudSelectedItemCount);
  const focusedItemKey = useAppSelector(selectCloudFocusedItemKey);
  const selectionAnchorKey = useAppSelector(selectCloudSelectionAnchorKey);
  const selectedProjectId = useAppSelector(selectCloudSelectedProjectId);
  const selectedFolderId = useAppSelector(selectCloudSelectedFolderId);
  const selectedFileId = useAppSelector(selectCloudSelectedFileId);
  const selectedItemType = useAppSelector(selectCloudSelectedItemType);
  const projectActionError = useAppSelector(selectCloudProjectActionError);
  const folderActionError = useAppSelector(selectCloudFolderActionError);
  const fileActionError = useAppSelector(selectCloudFileActionError);
  const workspaceActions = useWorkspaceActions();

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProjectExpanded, setIsProjectExpanded] = useState(true);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [invalidDropTargetKey, setInvalidDropTargetKey] = useState<string | null>(null);
  const hoverOpenTimerRef = useRef<number | null>(null);
  const isDragDropEnabled = !searchQuery && !draft && !deleteTarget;

  useEffect(() => {
    if (activeProjectId) {
      setIsProjectExpanded(true);
    }
  }, [activeProjectId]);

  const filteredTree = useMemo(
    () => (activeProjectTree ? filterTree(activeProjectTree, searchQuery) : null),
    [activeProjectTree, searchQuery],
  );
  const selectedItemKeySet = useMemo(() => new Set(selectedItemKeys), [selectedItemKeys]);
  const visibleSelectionItems = useMemo(
    () =>
      activeProjectId && filteredTree
        ? buildVisibleCloudSelectionItems(activeProjectId, filteredTree, expandedFolderIds)
        : [],
    [activeProjectId, expandedFolderIds, filteredTree],
  );
  const selectedMovableItems = useMemo(
    () =>
      selectedItems.filter(
        (item): item is CloudExplorerSelectionItem =>
          item.itemType === "folder" || item.itemType === "file",
      ),
    [selectedItems],
  );

  const filteredProjects = useMemo(() => {
    if (!searchQuery) {
      return projects;
    }

    const loweredQuery = searchQuery.toLowerCase();

    return projects.filter((project) => {
      if (project.name.toLowerCase().includes(loweredQuery)) {
        return true;
      }

      if (project.id !== activeProjectId || !filteredTree) {
        return false;
      }

      return filteredTree.files.length > 0 || filteredTree.folders.length > 0;
    });
  }, [activeProjectId, filteredTree, projects, searchQuery]);

  const aggregatedError =
    localError ??
    folderActionError?.message ??
    fileActionError?.message ??
    projectActionError?.message ??
    activeProjectFilesError?.message ??
    projectsError?.message ??
    null;

  const authRecoveryRequired =
    isAuthenticated &&
    [projectsError, activeProjectFilesError, projectActionError, folderActionError, fileActionError].some(isAuthError);

  const resetMessages = useCallback(() => {
    setLocalError(null);
    dispatch(clearProjectsError());
    dispatch(clearProjectActionError());
    dispatch(clearFolderActionError());
    dispatch(clearFileActionError());
  }, [dispatch]);

  const handleRefresh = useCallback(async () => {
    resetMessages();

    try {
      await workspaceActions.refreshCloudProjects();
    } catch (error) {
      setLocalError(normalizeApiError(error).message);
    }
  }, [resetMessages, workspaceActions]);

  const commitSelection = useCallback(
    (
      items: CloudSelectionEntry[],
      nextFocusedItemKey?: string | null,
      nextSelectionAnchorKey?: string | null,
    ) => {
      dispatch(
        setCloudSelection({
          items,
          focusedItemKey: nextFocusedItemKey ?? items[0]?.key ?? null,
          selectionAnchorKey: nextSelectionAnchorKey ?? nextFocusedItemKey ?? items[0]?.key ?? null,
        }),
      );
    },
    [dispatch],
  );

  const updateFileOrFolderSelection = useCallback(
    (
      item: CloudExplorerSelectionItem,
      event?:
        | Pick<MouseEvent, "ctrlKey" | "metaKey" | "shiftKey">
        | Pick<globalThis.KeyboardEvent, "ctrlKey" | "metaKey" | "shiftKey">,
    ) => {
      if (!activeProjectId || item.projectId !== activeProjectId) {
        commitSelection([item], item.key, item.key);
        return;
      }

      if (event?.shiftKey) {
        const visibleKeys = visibleSelectionItems.map((entry) => entry.key);
        const rangeStartKey = selectionAnchorKey ?? focusedItemKey ?? item.key;
        const startIndex = visibleKeys.indexOf(rangeStartKey);
        const endIndex = visibleKeys.indexOf(item.key);

        if (startIndex >= 0 && endIndex >= 0) {
          const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
          commitSelection(visibleSelectionItems.slice(from, to + 1), item.key, rangeStartKey);
          return;
        }
      }

      if (event && hasPrimaryModifier(event)) {
        const nextItems = selectedItemKeySet.has(item.key)
          ? selectedItems.filter((entry) => entry.key !== item.key)
          : [...selectedItems, item];
        commitSelection(nextItems, item.key, selectionAnchorKey ?? item.key);
        return;
      }

      commitSelection([item], item.key, item.key);
    },
    [
      activeProjectId,
      commitSelection,
      focusedItemKey,
      selectedItemKeySet,
      selectedItems,
      selectionAnchorKey,
      visibleSelectionItems,
    ],
  );

  const handleProjectClick = useCallback(
    async (projectId: string) => {
      resetMessages();

      if (activeProjectId === projectId) {
        dispatch(selectCloudItem({ projectId, folderId: null, fileId: null, itemType: "project" }));
        setIsProjectExpanded((currentValue) => !currentValue);
        return;
      }

      try {
        await workspaceActions.openCloudProject(projectId);
      } catch (error) {
        setLocalError(normalizeApiError(error).message);
      }
    },
    [activeProjectId, dispatch, resetMessages, workspaceActions],
  );

  const handleOpenFile = useCallback(
    async (projectId: string, fileId: string) => {
      resetMessages();

      try {
        dispatch(selectCloudItem({ projectId, folderId: null, fileId, itemType: "file" }));
        await workspaceActions.openCloudFile(projectId, fileId);
      } catch (error) {
        setLocalError(normalizeApiError(error).message);
      }
    },
    [dispatch, resetMessages, workspaceActions],
  );

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((currentIds) =>
      currentIds.includes(folderId)
        ? currentIds.filter((id) => id !== folderId)
        : [...currentIds, folderId],
    );
  }, []);

  return {
    dispatch,
    workspaceActions,
    isAuthenticated,
    searchQuery,
    explorerIntent,
    projects,
    projectsStatus,
    activeProjectId,
    activeProjectTree,
    activeProjectFilesStatus,
    treeByProjectId,
    selectedItems,
    selectedItemCount,
    selectedItemKeys,
    focusedItemKey,
    selectionAnchorKey,
    selectedProjectId,
    selectedFolderId,
    selectedFileId,
    selectedItemType,
    draft,
    setDraft,
    deleteTarget,
    setDeleteTarget,
    localError,
    setLocalError,
    isProjectExpanded,
    setIsProjectExpanded,
    expandedFolderIds,
    setExpandedFolderIds,
    contextMenu,
    setContextMenu,
    dragState,
    setDragState,
    dropTarget,
    setDropTarget,
    invalidDropTargetKey,
    setInvalidDropTargetKey,
    hoverOpenTimerRef,
    isDragDropEnabled,
    filteredTree,
    filteredProjects,
    selectedItemKeySet,
    visibleSelectionItems,
    selectedMovableItems,
    aggregatedError,
    authRecoveryRequired,
    resetMessages,
    handleRefresh,
    commitSelection,
    updateFileOrFolderSelection,
    handleProjectClick,
    handleOpenFile,
    toggleFolder,
  };
}
