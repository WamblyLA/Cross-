import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  closeLocalFilesByPrefix,
  openLocalFile,
  renameFilePath,
} from "../../../features/files/filesSlice";
import {
  clearExplorerIntent,
  setExplorerSelectionSummary,
} from "../../../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  getBaseName,
  getParentPath,
  isSameOrChildPath,
  replacePathPrefix,
} from "../../../utils/path";
import { FILE_TREE_HOVER_EXPAND_DELAY_MS } from "./fileTreeConstants";
import {
  canDropIntoDirectory,
  computeNextExpandedAfterMove,
  normalizeDraggedPaths,
  resolveDropDirectory,
} from "./fileTreeDnd";
import {
  buildRangeSelection,
  moveSelectionByOffset,
  resolvePrimarySelectionPath,
  selectAllVisible,
} from "./fileTreeKeyboard";
import { buildFileTreeContextMenuSections } from "./fileTreeMenuSections";
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
  getDropTargetKey,
  hasPrimaryModifier,
  loadExpandedTree,
  loadFolderNodes,
  pruneNestedPaths,
  replaceNodeChildren,
  uniqPaths,
} from "./fileTreeUtils";

export function useFileTreeController() {
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
      ? {
          parentPath: draft.parentPath,
          nodeType: draft.nodeType,
        }
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

  const handleToggleFolder = useCallback(
    async (node: WorkspaceTreeNode) => {
      if (expandedSet.has(node.path)) {
        const nextExpandedPaths = expandedPaths.filter(
          (path) => !isSameOrChildPath(path, node.path),
        );
        setExpandedPaths(nextExpandedPaths);
        return;
      }

      const nextExpandedPaths = uniqPaths([...expandedPaths, node.path]);
      setExpandedPaths(nextExpandedPaths);

      if (node.isLoaded) {
        return;
      }

      setLoadingPath(node.path);

      try {
        const children = await loadFolderNodes(node.path);
        setTree((currentTree) =>
          replaceNodeChildren(currentTree, node.path, (currentNode) => ({
            ...currentNode,
            children,
            isLoaded: true,
          })),
        );
      } catch (loadError) {
        console.error("Ошибка при раскрытии папки", loadError);
        setError("Не удалось загрузить содержимое папки.");
      } finally {
        setLoadingPath(null);
      }
    },
    [expandedPaths, expandedSet],
  );

  const handleOpenFile = useCallback(
    async (node: WorkspaceTreeNode) => {
      try {
        const content = await window.electronAPI.readFile(node.path);

        dispatch(
          openLocalFile({
            path: node.path,
            content: content ?? "",
          }),
        );
      } catch (loadError) {
        console.error("Ошибка при открытии файла", loadError);
        setError("Не удалось открыть выбранный файл.");
      }
    },
    [dispatch],
  );

  const handleSelectNode = useCallback(
    (node: WorkspaceTreeNode, event: MouseEvent<HTMLDivElement>) => {
      focusExplorer();
      setContextMenu(null);
      setDeleteTarget(null);

      if (event.shiftKey) {
        const rangeStartPath = anchorPath ?? focusedPath ?? node.path;
        const rangeSelection = buildRangeSelection(visibleNodePaths, rangeStartPath, node.path);

        if (rangeSelection) {
          commitSelection(rangeSelection, node.path, rangeStartPath);
          return;
        }
      }

      if (hasPrimaryModifier(event)) {
        const nextSelectedPaths = selectedSet.has(node.path)
          ? selectedPaths.filter((path) => path !== node.path)
          : [...selectedPaths, node.path];
        commitSelection(uniqPaths(nextSelectedPaths), node.path, anchorPath ?? node.path);
        return;
      }

      commitSelection([node.path], node.path, node.path);
    },
    [
      anchorPath,
      commitSelection,
      focusExplorer,
      focusedPath,
      selectedPaths,
      selectedSet,
      visibleNodePaths,
    ],
  );

  const handleNodeDoubleClick = useCallback(
    (node: WorkspaceTreeNode) => {
      if (node.type === "folder") {
        void handleToggleFolder(node);
        return;
      }

      void handleOpenFile(node);
    },
    [handleOpenFile, handleToggleFolder],
  );

  const beginCreate = useCallback(
    async (nodeType: "file" | "folder", parentPathOverride?: string) => {
      const parentPath = parentPathOverride ?? resolveCreateParentPath();

      if (!parentPath) {
        return;
      }

      setDeleteTarget(null);
      setContextMenu(null);
      await ensureFolderVisible(parentPath);
      commitSelection([parentPath], parentPath, parentPath);
      setDraft({
        mode: "create",
        parentPath,
        nodeType,
        value: "",
      });
    },
    [commitSelection, ensureFolderVisible, resolveCreateParentPath],
  );

  const beginRename = useCallback(
    (node?: WorkspaceTreeNode) => {
      const targetPath = node?.path ?? currentPrimarySelectionPath;
      const targetNode = node ?? (targetPath ? nodeByPath.get(targetPath) ?? null : null);

      if (!targetNode || targetNode.path === rootPath) {
        return;
      }

      if (!node && selectedPaths.length !== 1) {
        setError("Переименование доступно только для одного элемента.");
        return;
      }

      setDeleteTarget(null);
      setContextMenu(null);
      commitSelection([targetNode.path], targetNode.path, targetNode.path);
      setDraft({
        mode: "rename",
        targetPath: targetNode.path,
        parentPath: getParentPath(targetNode.path) ?? rootPath ?? targetNode.path,
        nodeType: targetNode.type,
        value: getBaseName(targetNode.path),
      });
    },
    [commitSelection, currentPrimarySelectionPath, nodeByPath, rootPath, selectedPaths.length],
  );

  const beginDelete = useCallback(
    (pathsOverride?: string[]) => {
      const basePaths = pathsOverride ?? selectedPaths;
      const normalizedPaths = pruneNestedPaths(basePaths).filter((path) => path && path !== rootPath);

      if (normalizedPaths.length === 0) {
        return;
      }

      const items = normalizedPaths
        .map((path) => {
          const node = nodeByPath.get(path);

          if (!node) {
            return null;
          }

          return {
            path: node.path,
            name: node.name,
            nodeType: node.type,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (items.length === 0) {
        return;
      }

      setDraft(null);
      setContextMenu(null);
      commitSelection(
        items.map((item) => item.path),
        items[0]?.path ?? null,
        items[0]?.path ?? null,
      );
      setDeleteTarget({ items });
    },
    [commitSelection, nodeByPath, rootPath, selectedPaths],
  );

  const setDraftValue = useCallback((value: string) => {
    setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft));
  }, []);

  const cancelDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const handleDraftSubmit = useCallback(async () => {
    if (!draft) {
      return;
    }

    const nextName = draft.value.trim();

    if (!nextName) {
      setDraft(null);
      return;
    }

    try {
      if (draft.mode === "create") {
        const result = await window.electronAPI.createFileSystemItem(
          draft.parentPath,
          nextName,
          draft.nodeType === "folder",
        );

        const nextExpandedPaths =
          draft.nodeType === "folder"
            ? uniqPaths([...expandedPaths, draft.parentPath, result.path])
            : uniqPaths([...expandedPaths, draft.parentPath]);

        setExpandedPaths(nextExpandedPaths);
        setDraft(null);
        await refreshTree(nextExpandedPaths);
        commitSelection([result.path], result.path, result.path);

        if (draft.nodeType === "file") {
          dispatch(
            openLocalFile({
              path: result.path,
              content: "",
            }),
          );
        }

        return;
      }

      const result = await window.electronAPI.renameFileSystemItem(draft.targetPath, nextName);
      const nextExpandedPaths = uniqPaths(
        expandedPaths.map((path) =>
          isSameOrChildPath(path, draft.targetPath)
            ? replacePathPrefix(path, draft.targetPath, result.path)
            : path,
        ),
      );

      setExpandedPaths(nextExpandedPaths);
      setDraft(null);
      dispatch(
        renameFilePath({
          oldPath: draft.targetPath,
          newPath: result.path,
        }),
      );
      commitSelection([result.path], result.path, result.path);
      await refreshTree(nextExpandedPaths);
    } catch (submitError) {
      console.error("Ошибка при изменении дерева файлов", submitError);
      setError(
        submitError instanceof Error ? submitError.message : "Не удалось выполнить операцию.",
      );
    }
  }, [commitSelection, dispatch, draft, expandedPaths, refreshTree]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    const deletePaths = pruneNestedPaths(deleteTarget.items.map((item) => item.path));

    try {
      for (const targetPath of deletePaths) {
        await window.electronAPI.removeFileSystemItem(targetPath);
        dispatch(closeLocalFilesByPrefix(targetPath));
      }

      const fallbackPath = deletePaths[0] ? getParentPath(deletePaths[0]) ?? rootPath : rootPath;
      const nextExpandedPaths = expandedPaths.filter(
        (path) => !deletePaths.some((targetPath) => isSameOrChildPath(path, targetPath)),
      );

      setExpandedPaths(nextExpandedPaths);
      setDeleteTarget(null);
      setDraft(null);
      await refreshTree(nextExpandedPaths);

      if (fallbackPath && fallbackPath !== rootPath) {
        commitSelection([fallbackPath], fallbackPath, fallbackPath);
      } else {
        commitSelection([], null, null);
      }
    } catch (removeError) {
      console.error("Ошибка при удалении файла или папки", removeError);
      setError(
        removeError instanceof Error ? removeError.message : "Не удалось удалить выбранные элементы.",
      );
    }
  }, [commitSelection, deleteTarget, dispatch, expandedPaths, refreshTree, rootPath]);

  const copySelectionToClipboard = useCallback(
    (mode: "copy" | "cut", pathsOverride?: string[]) => {
      const sourcePaths = pruneNestedPaths(pathsOverride ?? selectedPaths).filter(
        (path) => path !== rootPath,
      );

      if (sourcePaths.length === 0) {
        return;
      }

      setClipboard({
        mode,
        paths: sourcePaths,
      });
    },
    [rootPath, selectedPaths],
  );

  const resolvePasteTargetDirectory = useCallback(
    (pathOverride?: string) => {
      if (!rootPath) {
        return null;
      }

      const targetPath = pathOverride ?? currentPrimarySelectionPath;
      const targetNode = targetPath ? nodeByPath.get(targetPath) ?? null : null;

      if (targetNode?.type === "folder") {
        return targetNode.path;
      }

      if (targetNode?.type === "file") {
        return getParentPath(targetNode.path) ?? rootPath;
      }

      return rootPath;
    },
    [currentPrimarySelectionPath, nodeByPath, rootPath],
  );

  const handlePaste = useCallback(
    async (targetPathOverride?: string) => {
      if (!clipboard) {
        return;
      }

      const targetDirectory = resolvePasteTargetDirectory(targetPathOverride);

      if (!targetDirectory) {
        return;
      }

      try {
        const operation =
          clipboard.mode === "copy"
            ? window.electronAPI.copyFileSystemItems
            : window.electronAPI.moveFileSystemItems;
        const result = await operation(clipboard.paths, targetDirectory);
        const nextExpandedPaths = uniqPaths([...expandedPaths, targetDirectory]);

        if (clipboard.mode === "cut") {
          clipboard.paths.forEach((sourcePath, index) => {
            const nextPath = result.paths[index];

            if (nextPath && nextPath !== sourcePath) {
              dispatch(
                renameFilePath({
                  oldPath: sourcePath,
                  newPath: nextPath,
                }),
              );
            }
          });
          setClipboard(null);
        }

        setExpandedPaths(nextExpandedPaths);
        await refreshTree(nextExpandedPaths);
        commitSelection(result.paths, result.paths[0] ?? null, result.paths[0] ?? null);
      } catch (pasteError) {
        console.error("Ошибка при вставке элементов", pasteError);
        setError(
          pasteError instanceof Error ? pasteError.message : "Не удалось вставить выбранные элементы.",
        );
      }
    },
    [clipboard, commitSelection, dispatch, expandedPaths, refreshTree, resolvePasteTargetDirectory],
  );

  const scheduleFolderAutoExpand = useCallback(
    (folderPath: string) => {
      clearHoverExpandTimer();

      if (expandedSet.has(folderPath)) {
        return;
      }

      hoverExpandTimerRef.current = window.setTimeout(() => {
        void ensureFolderVisible(folderPath);
      }, FILE_TREE_HOVER_EXPAND_DELAY_MS);
    },
    [clearHoverExpandTimer, ensureFolderVisible, expandedSet],
  );

  const performDragMove = useCallback(
    async (target: DropTarget) => {
      if (!dragState) {
        return;
      }

      const targetDirectory = resolveDropDirectory(rootPath, target, nodeByPath);

      if (!canDropIntoDirectory(dragState.paths, targetDirectory, rootPath) || !targetDirectory) {
        clearDragDropState();
        return;
      }

      try {
        const result = await window.electronAPI.moveFileSystemItems(dragState.paths, targetDirectory);
        const nextExpandedPaths = computeNextExpandedAfterMove(
          expandedPaths,
          dragState.paths,
          result.paths,
          targetDirectory,
          rootPath,
        );

        dragState.paths.forEach((sourcePath, index) => {
          const nextPath = result.paths[index];

          if (nextPath && nextPath !== sourcePath) {
            dispatch(
              renameFilePath({
                oldPath: sourcePath,
                newPath: nextPath,
              }),
            );
          }
        });

        setExpandedPaths(nextExpandedPaths);
        await refreshTree(nextExpandedPaths);
        commitSelection(result.paths, result.paths[0] ?? null, result.paths[0] ?? null);
      } catch (moveError) {
        console.error("Ошибка при переносе элементов", moveError);
        setError(
          moveError instanceof Error ? moveError.message : "Не удалось переместить выбранные элементы.",
        );
      } finally {
        clearDragDropState();
      }
    },
    [
      clearDragDropState,
      commitSelection,
      dispatch,
      dragState,
      expandedPaths,
      nodeByPath,
      refreshTree,
      rootPath,
    ],
  );

  const handleNodeDragStart = useCallback(
    (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => {
      if (!isDragDropEnabled) {
        event.preventDefault();
        return;
      }

      const nextSelection = selectedSet.has(node.path) ? selectedPaths : [node.path];
      const dragPaths = normalizeDraggedPaths(nextSelection, rootPath);

      if (dragPaths.length === 0) {
        event.preventDefault();
        return;
      }

      if (!selectedSet.has(node.path)) {
        commitSelection([node.path], node.path, node.path);
      }

      focusExplorer();
      setContextMenu(null);
      setDraft(null);
      setDeleteTarget(null);
      setDragState({ paths: dragPaths });
      setDropTarget(null);
      setInvalidDropTargetKey(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", node.path);
    },
    [
      commitSelection,
      focusExplorer,
      isDragDropEnabled,
      rootPath,
      selectedPaths,
      selectedSet,
    ],
  );

  const handleNodeDragEnd = useCallback(() => {
    clearDragDropState();
  }, [clearDragDropState]);

  const handleNodeDragOver = useCallback(
    (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => {
      if (!dragState || !isDragDropEnabled || node.type !== "folder") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nextTarget: DropTarget = { kind: "folder", path: node.path };
      const targetDirectory = resolveDropDirectory(rootPath, nextTarget, nodeByPath);
      const validDrop = canDropIntoDirectory(dragState.paths, targetDirectory, rootPath);

      setDropTarget(validDrop ? nextTarget : null);
      setInvalidDropTargetKey(validDrop ? null : getDropTargetKey(nextTarget));
      event.dataTransfer.dropEffect = validDrop ? "move" : "none";

      if (validDrop) {
        scheduleFolderAutoExpand(node.path);
      } else {
        clearHoverExpandTimer();
      }
    },
    [
      clearHoverExpandTimer,
      dragState,
      isDragDropEnabled,
      nodeByPath,
      rootPath,
      scheduleFolderAutoExpand,
    ],
  );

  const handleNodeDragLeave = useCallback(
    (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      const targetKey = getDropTargetKey({ kind: "folder", path: node.path });

      clearHoverExpandTimer();
      setDropTarget((currentTarget) =>
        getDropTargetKey(currentTarget) === targetKey ? null : currentTarget,
      );
      setInvalidDropTargetKey((currentKey) => (currentKey === targetKey ? null : currentKey));
    },
    [clearHoverExpandTimer],
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
        !dragState ||
        !isDragDropEnabled ||
        (event.target as HTMLElement).closest("[data-tree-node='true']")
      ) {
        return;
      }

      const nextTarget: DropTarget = { kind: "root" };
      const targetDirectory = resolveDropDirectory(rootPath, nextTarget, nodeByPath);
      const validDrop = canDropIntoDirectory(dragState.paths, targetDirectory, rootPath);

      if (!validDrop) {
        return;
      }

      event.preventDefault();
      setDropTarget(nextTarget);
      setInvalidDropTargetKey(null);
      event.dataTransfer.dropEffect = "move";
    },
    [dragState, isDragDropEnabled, nodeByPath, rootPath],
  );

  const handleRootDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      clearHoverExpandTimer();
      setDropTarget((currentTarget) => (currentTarget?.kind === "root" ? null : currentTarget));
      setInvalidDropTargetKey(null);
    },
    [clearHoverExpandTimer],
  );

  const handleRootDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!dragState || (event.target as HTMLElement).closest("[data-tree-node='true']")) {
        return;
      }

      event.preventDefault();
      void performDragMove({ kind: "root" });
    },
    [dragState, performDragMove],
  );

  const handleNodeContextMenu = useCallback(
    (node: WorkspaceTreeNode, event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      focusExplorer();
      setDraft(null);
      setDeleteTarget(null);

      const nextSelection = selectedSet.has(node.path) ? selectedPaths : [node.path];
      commitSelection(nextSelection, node.path, anchorPath ?? node.path);
      setContextMenu({
        kind: "selection",
        x: event.clientX,
        y: event.clientY,
        paths: nextSelection,
        primaryPath: node.path,
      });
    },
    [anchorPath, commitSelection, focusExplorer, selectedPaths, selectedSet],
  );

  const handleRootContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("[data-tree-node='true']")) {
        return;
      }

      event.preventDefault();
      focusExplorer();
      commitSelection([], null, null);
      setContextMenu({
        kind: "root",
        x: event.clientX,
        y: event.clientY,
      });
    },
    [commitSelection, focusExplorer],
  );

  const handleKeyboardSelectionMove = useCallback(
    (direction: -1 | 1, extendSelection: boolean) => {
      const nextSelection = moveSelectionByOffset({
        visiblePaths: visibleNodePaths,
        selectedPaths,
        focusedPath,
        anchorPath,
        direction,
        extendSelection,
      });

      if (!nextSelection) {
        return;
      }

      commitSelection(
        nextSelection.selectedPaths,
        nextSelection.focusedPath,
        nextSelection.anchorPath,
      );
    },
    [anchorPath, commitSelection, focusedPath, selectedPaths, visibleNodePaths],
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
        const primaryNode = currentPrimarySelectionPath
          ? nodeByPath.get(currentPrimarySelectionPath) ?? null
          : null;

        if (!primaryNode) {
          return;
        }

        event.preventDefault();

        if (primaryNode.type === "folder") {
          void handleToggleFolder(primaryNode);
        } else {
          void handleOpenFile(primaryNode);
        }

        return;
      }

      if (event.key === "Delete") {
        if (selectedPaths.length === 0) {
          return;
        }

        event.preventDefault();
        beginDelete();
        return;
      }

      if (event.key === "F2") {
        if (selectedPaths.length !== 1) {
          return;
        }

        event.preventDefault();
        beginRename();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setContextMenu(null);
        setDeleteTarget(null);
        setDraft(null);
        return;
      }

      if (
        hasPrimaryModifier(event) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "a"
      ) {
        event.preventDefault();
        const nextSelection = selectAllVisible(visibleNodePaths);
        commitSelection(nextSelection.selectedPaths, nextSelection.focusedPath, nextSelection.anchorPath);
        return;
      }

      if (
        hasPrimaryModifier(event) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "c"
      ) {
        if (selectedPaths.length === 0) {
          return;
        }

        event.preventDefault();
        copySelectionToClipboard("copy");
        return;
      }

      if (
        hasPrimaryModifier(event) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "x"
      ) {
        if (selectedPaths.length === 0) {
          return;
        }

        event.preventDefault();
        copySelectionToClipboard("cut");
        return;
      }

      if (
        hasPrimaryModifier(event) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "v"
      ) {
        if (!clipboard) {
          return;
        }

        event.preventDefault();
        void handlePaste();
      }
    },
    [
      beginDelete,
      beginRename,
      clipboard,
      commitSelection,
      copySelectionToClipboard,
      currentPrimarySelectionPath,
      handleKeyboardSelectionMove,
      handleOpenFile,
      handlePaste,
      handleToggleFolder,
      nodeByPath,
      selectedPaths.length,
      visibleNodePaths,
    ],
  );

  const contextMenuSections = useMemo(
    () =>
      buildFileTreeContextMenuSections({
        contextMenu,
        rootPath,
        clipboard,
        nodeByPath,
        beginCreate,
        beginRename,
        beginDelete,
        handleOpenFile,
        handlePaste,
        refreshTree,
        copySelectionToClipboard,
        expandedPaths,
      }),
    [
      beginCreate,
      beginDelete,
      beginRename,
      clipboard,
      contextMenu,
      copySelectionToClipboard,
      expandedPaths,
      handleOpenFile,
      handlePaste,
      nodeByPath,
      refreshTree,
      rootPath,
    ],
  );

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
    void refreshTree([]);
  }, [dispatch, refreshTree, rootPath]);

  useEffect(() => {
    if (!rootPath) {
      return;
    }

    const unsubscribe = window.electronAPI.onFolderChanged(() => {
      void refreshTree(expandedPaths);
    });

    return unsubscribe;
  }, [expandedPaths, refreshTree, rootPath]);

  useEffect(() => {
    const nextSelectedPaths = selectedPaths.filter((path) => allPaths.has(path));
    const nextFocusedPath = focusedPath && allPaths.has(focusedPath) ? focusedPath : null;
    const nextAnchorPath = anchorPath && allPaths.has(anchorPath) ? anchorPath : null;

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
  }, [allPaths, anchorPath, focusedPath, selectedPaths, syncSelectionSummary]);

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
          await refreshTree(expandedPaths);
          break;
        case "collapse-all":
          setExpandedPaths([]);
          setDraft(null);
          setDeleteTarget(null);
          await refreshTree([]);
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
    refreshTree,
  ]);

  const handleContainerMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("[data-tree-node='true']")) {
        return;
      }

      focusExplorer();
      commitSelection([], null, null);
      setContextMenu(null);
    },
    [commitSelection, focusExplorer],
  );

  return {
    rootPath,
    containerRef,
    error,
    isLoading,
    trimmedSearchQuery,
    draft,
    deleteTarget,
    contextMenu,
    dropTarget,
    invalidDropTargetKey,
    expandedSet,
    selectedSet,
    focusedPath,
    draggedPathSet,
    isDragDropEnabled,
    visibleRows,
    hasAnyNodes,
    hasVisibleNodes,
    contextMenuSections,
    setContextMenu,
    setDeleteTarget,
    confirmDelete,
    focusExplorer,
    setDraftValue,
    cancelDraft,
    handleDraftSubmit,
    handleNodeDoubleClick,
    handleNodeContextMenu,
    handleNodeDragEnd,
    handleNodeDragLeave,
    handleNodeDragOver,
    handleNodeDragStart,
    handleNodeDrop,
    handleOpenFile,
    handleRootContextMenu,
    handleRootDragLeave,
    handleRootDragOver,
    handleRootDrop,
    handleSelectNode,
    handleToggleFolder,
    handleTreeKeyDown,
    handleContainerMouseDown,
  };
}
