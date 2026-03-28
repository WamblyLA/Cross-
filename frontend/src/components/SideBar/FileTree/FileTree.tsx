import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closeLocalFilesByPrefix,
  openLocalFile,
  renameFilePath,
} from "../../../features/files/filesSlice";
import {
  clearExplorerIntent,
  selectNode,
} from "../../../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
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

type DeleteTarget = {
  path: string;
  name: string;
  nodeType: FsNodeType;
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

function uniqPaths(paths: string[]) {
  return Array.from(new Set(paths));
}

export default function FileTree() {
  const dispatch = useAppDispatch();
  const { rootPath, selectedPath, selectedType, searchQuery, explorerIntent } = useAppSelector(
    (state) => state.workspace,
  );

  const [tree, setTree] = useState<WorkspaceTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TreeDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const expandedSet = useMemo(() => new Set(expandedPaths), [expandedPaths]);

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

  useEffect(() => {
    if (!rootPath) {
      setTree([]);
      setExpandedPaths([]);
      setDraft(null);
      setDeleteTarget(null);
      setError(null);
      setLoadingPath(null);
      return;
    }

    setExpandedPaths([]);
    setDraft(null);
    setDeleteTarget(null);
    void refreshTree([]);
  }, [refreshTree, rootPath]);

  useEffect(() => {
    if (!rootPath) {
      return;
    }

    const unsubscribe = window.electronAPI.onFolderChanged(() => {
      void refreshTree(expandedPaths);
    });

    return unsubscribe;
  }, [expandedPaths, refreshTree, rootPath]);

  const resolveCreateParentPath = useCallback(() => {
    if (!rootPath) {
      return null;
    }

    if (selectedPath && selectedType === "folder") {
      return selectedPath;
    }

    if (selectedPath) {
      return getParentPath(selectedPath) ?? rootPath;
    }

    return rootPath;
  }, [rootPath, selectedPath, selectedType]);

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
      dispatch(
        selectNode({
          path: node.path,
          nodeType: "folder",
        }),
      );

      setDraft(null);
      setDeleteTarget(null);

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
    [dispatch, expandedPaths, expandedSet],
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
        dispatch(
          selectNode({
            path: node.path,
            nodeType: "file",
          }),
        );
      } catch (loadError) {
        console.error("Ошибка при открытии файла", loadError);
        setError("Не удалось открыть выбранный файл.");
      }
    },
    [dispatch],
  );

  const beginCreate = useCallback(
    async (nodeType: FsNodeType, parentPathOverride?: string) => {
      const parentPath = parentPathOverride ?? resolveCreateParentPath();

      if (!parentPath) {
        return;
      }

      setDeleteTarget(null);
      dispatch(
        selectNode({
          path: parentPath,
          nodeType: "folder",
        }),
      );

      await ensureFolderVisible(parentPath);

      setDraft({
        mode: "create",
        parentPath,
        nodeType,
        value: "",
      });
    },
    [dispatch, ensureFolderVisible, resolveCreateParentPath],
  );

  const beginRename = useCallback(
    (node?: WorkspaceTreeNode) => {
      const nextPath = node?.path ?? selectedPath;
      const nextType = node?.type ?? selectedType;

      if (!nextPath || !nextType || nextPath === rootPath) {
        return;
      }

      setDeleteTarget(null);
      dispatch(
        selectNode({
          path: nextPath,
          nodeType: nextType,
        }),
      );

      setDraft({
        mode: "rename",
        targetPath: nextPath,
        parentPath: getParentPath(nextPath) ?? rootPath ?? nextPath,
        nodeType: nextType,
        value: getBaseName(nextPath),
      });
    },
    [dispatch, rootPath, selectedPath, selectedType],
  );

  const beginDelete = useCallback(
    (node?: WorkspaceTreeNode) => {
      const nextPath = node?.path ?? selectedPath;
      const nextType = node?.type ?? selectedType;

      if (!nextPath || !nextType || nextPath === rootPath) {
        return;
      }

      setDraft(null);
      dispatch(
        selectNode({
          path: nextPath,
          nodeType: nextType,
        }),
      );
      setDeleteTarget({
        path: nextPath,
        name: getBaseName(nextPath),
        nodeType: nextType,
      });
    },
    [dispatch, rootPath, selectedPath, selectedType],
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

        dispatch(
          selectNode({
            path: result.path,
            nodeType: draft.nodeType,
          }),
        );

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
      dispatch(
        selectNode({
          path: result.path,
          nodeType: draft.nodeType,
        }),
      );
      await refreshTree(nextExpandedPaths);
    } catch (submitError) {
      console.error("Ошибка при изменении дерева файлов", submitError);
      setError(submitError instanceof Error ? submitError.message : "Не удалось выполнить операцию.");
    }
  }, [dispatch, draft, expandedPaths, refreshTree]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await window.electronAPI.removeFileSystemItem(deleteTarget.path);

      const nextExpandedPaths = expandedPaths.filter(
        (path) => !isSameOrChildPath(path, deleteTarget.path),
      );
      const isSelectionRemoved = Boolean(
        selectedPath && isSameOrChildPath(selectedPath, deleteTarget.path),
      );
      const nextSelectedPath = isSelectionRemoved
        ? getParentPath(deleteTarget.path) ?? rootPath
        : selectedPath;
      const nextSelectedType = nextSelectedPath
        ? isSelectionRemoved
          ? "folder"
          : selectedType
        : null;

      setExpandedPaths(nextExpandedPaths);
      setDeleteTarget(null);
      setDraft(null);
      dispatch(closeLocalFilesByPrefix(deleteTarget.path));
      dispatch(
        selectNode({
          path: nextSelectedPath ?? null,
          nodeType: nextSelectedType,
        }),
      );
      await refreshTree(nextExpandedPaths);
    } catch (removeError) {
      console.error("Ошибка при удалении файла или папки", removeError);
      setError(
        removeError instanceof Error ? removeError.message : "Не удалось удалить выбранный объект.",
      );
    }
  }, [deleteTarget, dispatch, expandedPaths, refreshTree, rootPath, selectedPath, selectedType]);

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

  const filteredTree = useMemo(
    () => filterTree(tree, searchQuery.trim()),
    [searchQuery, tree],
  );

  if (!rootPath) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">
        Папка пока не открыта. Используйте File -&gt; Открыть папку в верхнем меню.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error ? (
        <div className="border-b border-default px-3 py-2 text-sm text-error">{error}</div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-auto px-2 py-2 text-sm text-secondary">
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

        {!isLoading && filteredTree.length === 0 && searchQuery.trim() ? (
          <div className="px-3 py-3 text-sm text-muted">
            По запросу &quot;{searchQuery.trim()}&quot; ничего не найдено.
          </div>
        ) : null}

        {!isLoading && filteredTree.length === 0 && !searchQuery.trim() ? (
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
            selectedPath={selectedPath}
            draft={draft}
            loadingPath={loadingPath}
            onToggleFolder={(targetNode) => {
              void handleToggleFolder(targetNode);
            }}
            onOpenFile={(targetNode) => {
              void handleOpenFile(targetNode);
            }}
            onRequestCreate={(parentPath, nodeType) => {
              void beginCreate(nodeType, parentPath);
            }}
            onRequestRename={beginRename}
            onRequestDelete={beginDelete}
            onDraftChange={(value) =>
              setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))
            }
            onDraftSubmit={() => {
              void handleDraftSubmit();
            }}
            onDraftCancel={() => setDraft(null)}
          />
        ))}
      </div>

      {deleteTarget ? (
        <div className="border-t border-default bg-panel px-3 py-3">
          <div className="text-sm text-primary">
            Удалить {deleteTarget.nodeType === "folder" ? "папку" : "файл"} &quot;{deleteTarget.name}
            &quot;?
          </div>
          <div className="mt-1 text-xs leading-5 text-muted">
            Это действие удалит объект с локального диска{deleteTarget.nodeType === "folder"
              ? " вместе со всем содержимым."
              : "."}
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
    </div>
  );
}
