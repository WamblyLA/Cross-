import { useCallback, useMemo, useRef, useState } from "react";
import { setExplorerSelectionSummary } from "../../../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { getParentPath } from "../../../utils/path";
import { resolvePrimarySelectionPath } from "./fileTreeKeyboard";
import { buildFileTreeDerivedState } from "./fileTreeSelectors";
import type {
  ClipboardState,
  ContextMenuState,
  DeleteTarget,
  DragState,
  DropTarget,
  TreeDraft,
  WorkspaceTreeNode,
} from "./fileTreeTypes";
import {
  loadExpandedTree,
  loadFolderNodes,
  replaceNodeChildren,
  uniqPaths,
} from "./fileTreeUtils";

export function useFileTreeControllerCore() {
  const dispatch = useAppDispatch();
  const { rootPath, searchQuery, explorerIntent } = useAppSelector((state) => state.workspace);

  const [tree, setTree] = useState<WorkspaceTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [anchorPath, setAnchorPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TreeDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [invalidDropTargetKey, setInvalidDropTargetKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverExpandTimerRef = useRef<number | null>(null);

  const trimmedSearchQuery = searchQuery.trim();
  const expandedSet = useMemo(() => new Set(expandedPaths), [expandedPaths]);
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const draggedPathSet = useMemo(() => new Set(dragState?.paths ?? []), [dragState]);
  const isDragDropEnabled = trimmedSearchQuery.length === 0 && !draft && !deleteTarget;
  const createDraft =
    draft?.mode === "create"
      ? { parentPath: draft.parentPath, nodeType: draft.nodeType }
      : null;

  const derivedState = useMemo(
    () =>
      buildFileTreeDerivedState({
        tree,
        expandedPaths,
        searchQuery: trimmedSearchQuery,
        loadingPath,
        createDraft,
      }),
    [createDraft, expandedPaths, loadingPath, tree, trimmedSearchQuery],
  );

  const { nodeByPath, allPaths, visibleRows, visibleNodePaths, hasAnyNodes, hasVisibleNodes } =
    derivedState;

  const syncSelectionSummary = useCallback(
    (nextSelectedPaths: string[], nextFocusedPath: string | null) => {
      const primaryPath = resolvePrimarySelectionPath(nextFocusedPath, nextSelectedPaths);
      const primaryNode = primaryPath ? nodeByPath.get(primaryPath) ?? null : null;

      dispatch(
        setExplorerSelectionSummary({
          path: primaryPath,
          nodeType: primaryNode?.type ?? null,
          count: nextSelectedPaths.length,
        }),
      );
    },
    [dispatch, nodeByPath],
  );

  const commitSelection = useCallback(
    (nextSelectedPaths: string[], nextFocusedPath: string | null, nextAnchorPath = nextFocusedPath) => {
      setSelectedPaths(nextSelectedPaths);
      setFocusedPath(nextFocusedPath);
      setAnchorPath(nextAnchorPath);
      syncSelectionSummary(nextSelectedPaths, nextFocusedPath);
    },
    [syncSelectionSummary],
  );

  const focusExplorer = useCallback(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  const clearHoverExpandTimer = useCallback(() => {
    if (hoverExpandTimerRef.current !== null) {
      window.clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }
  }, []);

  const clearDragDropState = useCallback(() => {
    clearHoverExpandTimer();
    setDragState(null);
    setDropTarget(null);
    setInvalidDropTargetKey(null);
  }, [clearHoverExpandTimer]);

  const refreshTree = useCallback(
    async (nextExpandedPaths: string[]) => {
      if (!rootPath) {
        setTree([]);
        setError(null);
        return;
      }

      setIsLoading(true);

      try {
        const nextTree = await loadExpandedTree(rootPath, new Set(nextExpandedPaths));
        setTree(nextTree);
        setError(null);
      } catch (loadError) {
        console.error("Ошибка при загрузке дерева файлов", loadError);
        setError("Не удалось загрузить дерево файлов.");
      } finally {
        setIsLoading(false);
        setLoadingPath(null);
      }
    },
    [rootPath],
  );

  const currentPrimarySelectionPath = useMemo(
    () => resolvePrimarySelectionPath(focusedPath, selectedPaths),
    [focusedPath, selectedPaths],
  );

  const resolveCreateParentPath = useCallback(() => {
    if (!rootPath) {
      return null;
    }

    const primaryNode = currentPrimarySelectionPath
      ? nodeByPath.get(currentPrimarySelectionPath) ?? null
      : null;

    if (primaryNode?.type === "folder") {
      return primaryNode.path;
    }

    if (primaryNode?.type === "file") {
      return getParentPath(primaryNode.path) ?? rootPath;
    }

    return rootPath;
  }, [currentPrimarySelectionPath, nodeByPath, rootPath]);

  const ensureFolderVisible = useCallback(
    async (folderPath: string) => {
      if (folderPath === rootPath || !folderPath) {
        return expandedPaths;
      }

      const nextExpandedPaths = expandedSet.has(folderPath)
        ? expandedPaths
        : uniqPaths([...expandedPaths, folderPath]);

      if (nextExpandedPaths !== expandedPaths) {
        setExpandedPaths(nextExpandedPaths);
      }

      const folderNode = nodeByPath.get(folderPath) ?? null;

      if (!folderNode) {
        await refreshTree(nextExpandedPaths);
        return nextExpandedPaths;
      }

      if (folderNode.isLoaded) {
        return nextExpandedPaths;
      }

      setLoadingPath(folderPath);

      try {
        const children = await loadFolderNodes(folderPath);
        setTree((currentTree) =>
          replaceNodeChildren(currentTree, folderPath, (currentNode) => ({
            ...currentNode,
            children,
            isLoaded: true,
          })),
        );
      } catch (loadError) {
        console.error("Ошибка при загрузке папки", loadError);
        setError("Не удалось загрузить содержимое папки.");
      } finally {
        setLoadingPath(null);
      }

      return nextExpandedPaths;
    },
    [expandedPaths, expandedSet, nodeByPath, refreshTree, rootPath],
  );

  return {
    dispatch,
    rootPath,
    explorerIntent,
    tree,
    setTree,
    expandedPaths,
    setExpandedPaths,
    selectedPaths,
    setSelectedPaths,
    focusedPath,
    setFocusedPath,
    anchorPath,
    setAnchorPath,
    isLoading,
    setIsLoading,
    loadingPath,
    setLoadingPath,
    error,
    setError,
    draft,
    setDraft,
    deleteTarget,
    setDeleteTarget,
    contextMenu,
    setContextMenu,
    clipboard,
    setClipboard,
    dragState,
    setDragState,
    dropTarget,
    setDropTarget,
    invalidDropTargetKey,
    setInvalidDropTargetKey,
    containerRef,
    hoverExpandTimerRef,
    trimmedSearchQuery,
    expandedSet,
    selectedSet,
    draggedPathSet,
    isDragDropEnabled,
    nodeByPath,
    allPaths,
    visibleRows,
    visibleNodePaths,
    hasAnyNodes,
    hasVisibleNodes,
    syncSelectionSummary,
    commitSelection,
    focusExplorer,
    clearHoverExpandTimer,
    clearDragDropState,
    refreshTree,
    currentPrimarySelectionPath,
    resolveCreateParentPath,
    ensureFolderVisible,
  };
}
