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
import FloatingMenu, { type MenuSection } from "../../../ui/FloatingMenu";
import {
  getBaseName,
  getParentPath,
  isSameOrChildPath,
  replacePathPrefix,
  type FsNodeType,
} from "../../../utils/path";
import TreeItem, {
  InlineNameInput,
  type TreeDraft,
  type WorkspaceTreeNode,
} from "./TreeItem";

type FileSystemItem = {
  name: string;
  path: string;
  isDirectory: boolean;
};

type VisibleTreeRow = {
  node: WorkspaceTreeNode;
  depth: number;
};

type DeleteItem = {
  path: string;
  name: string;
  nodeType: FsNodeType;
};

type DeleteTarget = {
  items: DeleteItem[];
};

type ClipboardState = {
  mode: "copy" | "cut";
  paths: string[];
};

type ContextMenuState =
  | {
      kind: "root";
      x: number;
      y: number;
    }
  | {
      kind: "selection";
      x: number;
      y: number;
      paths: string[];
      primaryPath: string;
    };

type DragState = {
  paths: string[];
};

type DropTarget =
  | {
      kind: "root";
    }
  | {
      kind: "folder";
      path: string;
    };

function toTreeNode(item: FileSystemItem): WorkspaceTreeNode {
  return {
    name: item.name,
    path: item.path,
    type: item.isDirectory ? "folder" : "file",
    children: [],
    isLoaded: !item.isDirectory,
  };
}

async function loadFolderNodes(folderPath: string) {
  const items = await window.electronAPI.listFolder(folderPath);
  return items.map(toTreeNode);
}

async function loadExpandedTree(
  folderPath: string,
  expandedPaths: Set<string>,
): Promise<WorkspaceTreeNode[]> {
  const nodes = await loadFolderNodes(folderPath);

  return Promise.all(
    nodes.map(async (node): Promise<WorkspaceTreeNode> => {
      if (node.type !== "folder" || !expandedPaths.has(node.path)) {
        return node;
      }

      return {
        ...node,
        children: await loadExpandedTree(node.path, expandedPaths),
        isLoaded: true,
      };
    }),
  );
}

function findNode(nodes: WorkspaceTreeNode[], targetPath: string): WorkspaceTreeNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }

    if (node.type !== "folder" || node.children.length === 0) {
      continue;
    }

    const nested = findNode(node.children, targetPath);

    if (nested) {
      return nested;
    }
  }

  return null;
}

function updateNode(
  nodes: WorkspaceTreeNode[],
  targetPath: string,
  updater: (node: WorkspaceTreeNode) => WorkspaceTreeNode,
): WorkspaceTreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return updater(node);
    }

    if (node.type !== "folder" || node.children.length === 0) {
      return node;
    }

    const nextChildren = updateNode(node.children, targetPath, updater);

    if (nextChildren === node.children) {
      return node;
    }

    return {
      ...node,
      children: nextChildren,
    };
  });
}

function filterTree(nodes: WorkspaceTreeNode[], query: string): WorkspaceTreeNode[] {
  if (!query) {
    return nodes;
  }

  const loweredQuery = query.toLowerCase();

  return nodes.flatMap((node) => {
    const filteredChildren =
      node.type === "folder" ? filterTree(node.children, loweredQuery) : [];
    const isMatch = node.name.toLowerCase().includes(loweredQuery);

    if (!isMatch && filteredChildren.length === 0) {
      return [];
    }

    return [
      {
        ...node,
        children: filteredChildren,
      },
    ];
  });
}

function flattenVisibleRows(
  nodes: WorkspaceTreeNode[],
  expandedPaths: Set<string>,
  depth = 0,
): VisibleTreeRow[] {
  return nodes.flatMap((node) => {
    const rows: VisibleTreeRow[] = [{ node, depth }];

    if (node.type === "folder" && expandedPaths.has(node.path)) {
      rows.push(...flattenVisibleRows(node.children, expandedPaths, depth + 1));
    }

    return rows;
  });
}

function collectAllPaths(nodes: WorkspaceTreeNode[]): Set<string> {
  const paths = new Set<string>();

  const visit = (items: WorkspaceTreeNode[]) => {
    items.forEach((node) => {
      paths.add(node.path);

      if (node.type === "folder" && node.children.length > 0) {
        visit(node.children);
      }
    });
  };

  visit(nodes);

  return paths;
}

function uniqPaths(paths: string[]) {
  return Array.from(new Set(paths));
}

function pruneNestedPaths(paths: string[]) {
  const uniquePaths = uniqPaths(paths).sort((left, right) => left.length - right.length);

  return uniquePaths.filter(
    (path, index) =>
      !uniquePaths.slice(0, index).some((candidatePath) => isSameOrChildPath(path, candidatePath)),
  );
}

function hasPrimaryModifier(event: MouseEvent | KeyboardEvent) {
  return event.ctrlKey || event.metaKey;
}

function getDropTargetKey(target: DropTarget | null) {
  if (!target) {
    return null;
  }

  return target.kind === "root" ? "root" : `folder:${target.path}`;
}

function remapTrackedPaths(paths: string[], sourcePaths: string[], movedPaths: string[]) {
  return uniqPaths(
    paths.map((trackedPath) => {
      let nextPath = trackedPath;

      sourcePaths.forEach((sourcePath, index) => {
        const movedPath = movedPaths[index];

        if (!movedPath || movedPath === sourcePath) {
          return;
        }

        if (isSameOrChildPath(nextPath, sourcePath)) {
          nextPath = replacePathPrefix(nextPath, sourcePath, movedPath);
        }
      });

      return nextPath;
    }),
  );
}

export default function FileTree() {
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

  const expandedSet = useMemo(() => new Set(expandedPaths), [expandedPaths]);
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const trimmedSearchQuery = searchQuery.trim();
  const filteredTree = useMemo(() => filterTree(tree, trimmedSearchQuery), [trimmedSearchQuery, tree]);
  const visibleRows = useMemo(
    () => flattenVisibleRows(filteredTree, expandedSet),
    [expandedSet, filteredTree],
  );
  const allTreePaths = useMemo(() => collectAllPaths(tree), [tree]);
  const draggedPathSet = useMemo(() => new Set(dragState?.paths ?? []), [dragState]);
  const isDragDropEnabled = trimmedSearchQuery.length === 0 && !draft && !deleteTarget;

  const syncSelectionSummary = useCallback(
    (nextSelectedPaths: string[], nextFocusedPath: string | null) => {
      const primaryPath =
        nextFocusedPath && nextSelectedPaths.includes(nextFocusedPath)
          ? nextFocusedPath
          : nextSelectedPaths[0] ?? null;
      const primaryNode = primaryPath ? findNode(tree, primaryPath) : null;

      dispatch(
        setExplorerSelectionSummary({
          path: primaryPath,
          nodeType: primaryNode?.type ?? null,
          count: nextSelectedPaths.length,
        }),
      );
    },
    [dispatch, tree],
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

  useEffect(() => clearHoverExpandTimer, [clearHoverExpandTimer]);

  useEffect(() => {
    if (!isDragDropEnabled && dragState) {
      clearDragDropState();
    }
  }, [clearDragDropState, dragState, isDragDropEnabled]);

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

  const resolvePrimarySelectionPath = useCallback(() => {
    if (focusedPath && selectedSet.has(focusedPath)) {
      return focusedPath;
    }

    return selectedPaths[0] ?? null;
  }, [focusedPath, selectedPaths, selectedSet]);

  const resolveCreateParentPath = useCallback(() => {
    if (!rootPath) {
      return null;
    }

    const primaryPath = resolvePrimarySelectionPath();
    const primaryNode = primaryPath ? findNode(tree, primaryPath) : null;

    if (primaryNode?.type === "folder") {
      return primaryNode.path;
    }

    if (primaryNode?.type === "file") {
      return getParentPath(primaryNode.path) ?? rootPath;
    }

    return rootPath;
  }, [resolvePrimarySelectionPath, rootPath, tree]);

  const getDropDirectory = useCallback(
    (target: DropTarget | null) => {
      if (!rootPath || !target) {
        return null;
      }

      if (target.kind === "root") {
        return rootPath;
      }

      const targetNode = findNode(tree, target.path);

      if (!targetNode || targetNode.type !== "folder") {
        return null;
      }

      return targetNode.path;
    },
    [rootPath, tree],
  );

  const canDropIntoDirectory = useCallback(
    (draggedPaths: string[], targetDirectory: string | null) => {
      if (!rootPath || !targetDirectory) {
        return false;
      }

      const normalizedPaths = pruneNestedPaths(draggedPaths).filter((path) => path !== rootPath);

      if (normalizedPaths.length === 0) {
        return false;
      }

      if (normalizedPaths.some((sourcePath) => isSameOrChildPath(targetDirectory, sourcePath))) {
        return false;
      }

      return normalizedPaths.some(
        (sourcePath) => (getParentPath(sourcePath) ?? rootPath) !== targetDirectory,
      );
    },
    [rootPath],
  );

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
    const nextSelectedPaths = selectedPaths.filter((path) => allTreePaths.has(path));
    const nextFocusedPath = focusedPath && allTreePaths.has(focusedPath) ? focusedPath : null;
    const nextAnchorPath = anchorPath && allTreePaths.has(anchorPath) ? anchorPath : null;

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
  }, [allTreePaths, anchorPath, focusedPath, selectedPaths, syncSelectionSummary]);

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

      const folderNode = findNode(tree, folderPath);

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
          updateNode(currentTree, folderPath, (currentNode) => ({
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
    [expandedPaths, expandedSet, refreshTree, rootPath, tree],
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
          updateNode(currentTree, node.path, (currentNode) => ({
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
      const visiblePaths = visibleRows.map((row) => row.node.path);

      if (event.shiftKey) {
        const rangeStartPath = anchorPath ?? focusedPath ?? node.path;
        const startIndex = visiblePaths.indexOf(rangeStartPath);
        const endIndex = visiblePaths.indexOf(node.path);

        if (startIndex >= 0 && endIndex >= 0) {
          const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
          commitSelection(visiblePaths.slice(from, to + 1), node.path, rangeStartPath);
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
    [anchorPath, commitSelection, focusExplorer, focusedPath, selectedPaths, selectedSet, visibleRows],
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
    async (nodeType: FsNodeType, parentPathOverride?: string) => {
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
      const targetPath = node?.path ?? resolvePrimarySelectionPath();
      const targetNode = node ?? (targetPath ? findNode(tree, targetPath) : null);

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
    [commitSelection, resolvePrimarySelectionPath, rootPath, selectedPaths.length, tree],
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
          const node = findNode(tree, path);

          if (!node) {
            return null;
          }

          return {
            path: node.path,
            name: node.name,
            nodeType: node.type,
          } satisfies DeleteItem;
        })
        .filter((item): item is DeleteItem => Boolean(item));

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
    [commitSelection, rootPath, selectedPaths, tree],
  );

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

      if (fallbackPath && fallbackPath !== rootPath && findNode(tree, fallbackPath)) {
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
  }, [commitSelection, deleteTarget, dispatch, expandedPaths, refreshTree, rootPath, tree]);

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

      const targetPath = pathOverride ?? resolvePrimarySelectionPath();
      const targetNode = targetPath ? findNode(tree, targetPath) : null;

      if (targetNode?.type === "folder") {
        return targetNode.path;
      }

      if (targetNode?.type === "file") {
        return getParentPath(targetNode.path) ?? rootPath;
      }

      return rootPath;
    },
    [resolvePrimarySelectionPath, rootPath, tree],
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
      }, 450);
    },
    [clearHoverExpandTimer, ensureFolderVisible, expandedSet],
  );

  const performDragMove = useCallback(
    async (target: DropTarget) => {
      if (!dragState) {
        return;
      }

      const targetDirectory = getDropDirectory(target);

      if (!targetDirectory || !canDropIntoDirectory(dragState.paths, targetDirectory)) {
        clearDragDropState();
        return;
      }

      try {
        const result = await window.electronAPI.moveFileSystemItems(dragState.paths, targetDirectory);
        const nextExpandedPaths = remapTrackedPaths(
          uniqPaths(
            targetDirectory === rootPath ? expandedPaths : [...expandedPaths, targetDirectory],
          ),
          dragState.paths,
          result.paths,
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
      canDropIntoDirectory,
      clearDragDropState,
      commitSelection,
      dispatch,
      dragState,
      expandedPaths,
      getDropDirectory,
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
      const dragPaths = pruneNestedPaths(nextSelection).filter((path) => path !== rootPath);

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
      const targetDirectory = getDropDirectory(nextTarget);
      const validDrop = canDropIntoDirectory(dragState.paths, targetDirectory);

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
      canDropIntoDirectory,
      clearHoverExpandTimer,
      dragState,
      getDropDirectory,
      isDragDropEnabled,
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
      if (!dragState || !isDragDropEnabled || (event.target as HTMLElement).closest("[data-tree-node='true']")) {
        return;
      }

      const nextTarget: DropTarget = { kind: "root" };
      const targetDirectory = getDropDirectory(nextTarget);
      const validDrop = canDropIntoDirectory(dragState.paths, targetDirectory);

      if (!validDrop) {
        return;
      }

      event.preventDefault();
      setDropTarget(nextTarget);
      setInvalidDropTargetKey(null);
      event.dataTransfer.dropEffect = "move";
    },
    [canDropIntoDirectory, dragState, getDropDirectory, isDragDropEnabled],
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

  const contextMenuSections = useMemo<MenuSection[]>(() => {
    if (!contextMenu || !rootPath) {
      return [];
    }

    if (contextMenu.kind === "root") {
      return [
        {
          id: "root-actions",
          items: [
            { id: "root-new-file", label: "Новый файл", onSelect: () => beginCreate("file", rootPath) },
            { id: "root-new-folder", label: "Новая папка", onSelect: () => beginCreate("folder", rootPath) },
            {
              id: "root-paste",
              label: clipboard?.mode === "cut" ? "Вставить (переместить)" : "Вставить",
              disabled: !clipboard,
              onSelect: () => handlePaste(rootPath),
            },
            { id: "root-refresh", label: "Обновить", onSelect: () => refreshTree(expandedPaths) },
          ],
        },
      ];
    }

    const normalizedPaths = pruneNestedPaths(contextMenu.paths);
    const primaryNode = findNode(tree, contextMenu.primaryPath);

    if (!primaryNode) {
      return [];
    }

    const singleSelection = normalizedPaths.length === 1;
    const canPasteIntoPrimary = primaryNode.type === "folder" && Boolean(clipboard);

    if (primaryNode.type === "folder") {
      return [
        {
          id: "folder-create",
          items: [
            {
              id: "folder-new-file",
              label: "Новый файл",
              disabled: !singleSelection,
              onSelect: () => beginCreate("file", primaryNode.path),
            },
            {
              id: "folder-new-folder",
              label: "Новая папка",
              disabled: !singleSelection,
              onSelect: () => beginCreate("folder", primaryNode.path),
            },
            {
              id: "folder-paste",
              label: clipboard?.mode === "cut" ? "Вставить (переместить)" : "Вставить",
              disabled: !canPasteIntoPrimary,
              onSelect: () => handlePaste(primaryNode.path),
            },
          ],
        },
        {
          id: "folder-actions",
          items: [
            { id: "folder-copy", label: "Копировать", onSelect: () => copySelectionToClipboard("copy", normalizedPaths) },
            { id: "folder-cut", label: "Вырезать", onSelect: () => copySelectionToClipboard("cut", normalizedPaths) },
            {
              id: "folder-rename",
              label: "Переименовать",
              disabled: !singleSelection,
              onSelect: () => beginRename(primaryNode),
            },
            {
              id: "folder-delete",
              label: normalizedPaths.length > 1 ? "Удалить выбранное" : "Удалить",
              tone: "danger",
              onSelect: () => beginDelete(normalizedPaths),
            },
          ],
        },
      ];
    }

    return [
      {
        id: "file-actions",
        items: [
          {
            id: "file-open",
            label: "Открыть",
            disabled: !singleSelection,
            onSelect: () => handleOpenFile(primaryNode),
          },
          { id: "file-copy", label: "Копировать", onSelect: () => copySelectionToClipboard("copy", normalizedPaths) },
          { id: "file-cut", label: "Вырезать", onSelect: () => copySelectionToClipboard("cut", normalizedPaths) },
          {
            id: "file-rename",
            label: "Переименовать",
            disabled: !singleSelection,
            onSelect: () => beginRename(primaryNode),
          },
          {
            id: "file-delete",
            label: normalizedPaths.length > 1 ? "Удалить выбранное" : "Удалить",
            tone: "danger",
            onSelect: () => beginDelete(normalizedPaths),
          },
        ],
      },
    ];
  }, [
    beginCreate,
    beginDelete,
    beginRename,
    clipboard,
    contextMenu,
    copySelectionToClipboard,
    expandedPaths,
    handleOpenFile,
    handlePaste,
    refreshTree,
    rootPath,
    tree,
  ]);

  const handleKeyboardSelectionMove = useCallback(
    (direction: -1 | 1, extendSelection: boolean) => {
      if (visibleRows.length === 0) {
        return;
      }

      const currentPath = focusedPath ?? selectedPaths[0] ?? visibleRows[0]?.node.path ?? null;
      const currentIndex = currentPath
        ? Math.max(0, visibleRows.findIndex((row) => row.node.path === currentPath))
        : 0;
      const nextIndex = Math.max(0, Math.min(visibleRows.length - 1, currentIndex + direction));
      const nextPath = visibleRows[nextIndex]?.node.path ?? null;

      if (!nextPath) {
        return;
      }

      if (extendSelection) {
        const rangeStartPath = anchorPath ?? focusedPath ?? nextPath;
        const startIndex = visibleRows.findIndex((row) => row.node.path === rangeStartPath);
        const [from, to] = startIndex <= nextIndex ? [startIndex, nextIndex] : [nextIndex, startIndex];
        commitSelection(
          visibleRows.slice(from, to + 1).map((row) => row.node.path),
          nextPath,
          rangeStartPath,
        );
        return;
      }

      commitSelection([nextPath], nextPath, nextPath);
    },
    [anchorPath, commitSelection, focusedPath, selectedPaths, visibleRows],
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
        const primaryPath = resolvePrimarySelectionPath();
        const primaryNode = primaryPath ? findNode(tree, primaryPath) : null;

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

      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        const nextSelectedPaths = visibleRows.map((row) => row.node.path);
        commitSelection(nextSelectedPaths, nextSelectedPaths[0] ?? null, nextSelectedPaths[0] ?? null);
        return;
      }

      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "c") {
        if (selectedPaths.length === 0) {
          return;
        }

        event.preventDefault();
        copySelectionToClipboard("copy");
        return;
      }

      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "x") {
        if (selectedPaths.length === 0) {
          return;
        }

        event.preventDefault();
        copySelectionToClipboard("cut");
        return;
      }

      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "v") {
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
      handleKeyboardSelectionMove,
      handleOpenFile,
      handlePaste,
      handleToggleFolder,
      resolvePrimarySelectionPath,
      selectedPaths.length,
      tree,
      visibleRows,
    ],
  );

  if (!rootPath) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">
        Папка пока не открыта. Используйте Файл -&gt; Открыть папку в верхнем меню.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error ? (
        <div className="border-b border-default px-3 py-2 text-sm text-error">{error}</div>
      ) : null}

      <div
        ref={containerRef}
        className={`min-h-0 flex-1 overflow-auto px-2 py-2 text-sm text-secondary outline-none ${
          dropTarget?.kind === "root" ? "bg-hover" : ""
        }`}
        style={
          invalidDropTargetKey === "root"
            ? { boxShadow: "inset 0 0 0 1px var(--error)" }
            : undefined
        }
        tabIndex={0}
        onContextMenu={handleRootContextMenu}
        onKeyDown={handleTreeKeyDown}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest("[data-tree-node='true']")) {
            return;
          }

          focusExplorer();
          commitSelection([], null, null);
          setContextMenu(null);
        }}
      >
        {draft?.mode === "create" && draft.parentPath === rootPath ? (
          <InlineNameInput
            value={draft.value}
            placeholder={draft.nodeType === "folder" ? "Имя новой папки" : "Имя нового файла"}
            depth={0}
            nodeType={draft.nodeType}
            onChange={(value) =>
              setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))
            }
            onSubmit={() => {
              void handleDraftSubmit();
            }}
            onCancel={() => setDraft(null)}
          />
        ) : null}

        {isLoading && tree.length === 0 ? (
          <div className="px-3 py-3 text-sm text-secondary">Загрузка проекта...</div>
        ) : null}

        {!isLoading && filteredTree.length === 0 && trimmedSearchQuery ? (
          <div className="px-3 py-3 text-sm text-muted">
            По запросу &quot;{trimmedSearchQuery}&quot; ничего не найдено.
          </div>
        ) : null}

        {!isLoading && filteredTree.length === 0 && !trimmedSearchQuery ? (
          <div className="px-3 py-3 text-sm text-muted">
            Папка пока пуста. Создайте новый файл или новую папку в проводнике.
          </div>
        ) : null}

        {filteredTree.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            expandedPaths={expandedSet}
            selectedPaths={selectedSet}
            focusedPath={focusedPath}
            draft={draft}
            loadingPath={loadingPath}
            onSelect={handleSelectNode}
            onDoubleClick={handleNodeDoubleClick}
            onToggleFolder={(targetNode) => {
              void handleToggleFolder(targetNode);
            }}
            onContextMenu={handleNodeContextMenu}
            onDraftChange={(value) =>
              setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))
            }
            onDraftSubmit={() => {
              void handleDraftSubmit();
            }}
            onDraftCancel={() => setDraft(null)}
            dragDisabled={!isDragDropEnabled}
            draggedPaths={draggedPathSet}
            dropTargetPath={dropTarget?.kind === "folder" ? dropTarget.path : null}
            invalidDropTargetPath={
              invalidDropTargetKey?.startsWith("folder:")
                ? invalidDropTargetKey.slice("folder:".length)
                : null
            }
            onDragStart={handleNodeDragStart}
            onDragEnd={handleNodeDragEnd}
            onDragOver={handleNodeDragOver}
            onDragLeave={handleNodeDragLeave}
            onDrop={handleNodeDrop}
          />
        ))}
      </div>

      {deleteTarget ? (
        <div className="border-t border-default bg-panel px-3 py-3">
          <div className="text-sm text-primary">
            {deleteTarget.items.length === 1
              ? `Удалить ${deleteTarget.items[0]?.nodeType === "folder" ? "папку" : "файл"} "${deleteTarget.items[0]?.name}"?`
              : `Удалить выбранные элементы (${deleteTarget.items.length})?`}
          </div>
          <div className="mt-1 text-xs leading-5 text-muted">
            Элементы будут удалены с локального диска. Удаление папок затронет все вложенные файлы.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="ui-button-secondary ui-control h-9 px-3 text-sm"
              onClick={() => setDeleteTarget(null)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="ui-control h-9 rounded-[8px] border px-3 text-sm text-error hover:bg-hover"
              style={{ borderColor: "var(--error)" }}
              onClick={() => {
                void confirmDelete();
              }}
            >
              Удалить
            </button>
          </div>
        </div>
      ) : null}

      {contextMenu ? (
        <FloatingMenu
          sections={contextMenuSections}
          position={{
            type: "point",
            x: contextMenu.x,
            y: contextMenu.y,
          }}
          width={240}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}
