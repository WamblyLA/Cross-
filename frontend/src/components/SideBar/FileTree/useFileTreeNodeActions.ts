import { useCallback, type MouseEvent } from "react";
import { openLocalFile } from "../../../features/files/filesSlice";
import {
  getBaseName,
  getParentPath,
  isSameOrChildPath,
} from "../../../utils/path";
import {
  buildRangeSelection,
  resolvePrimarySelectionPath,
} from "./fileTreeKeyboard";
import type { WorkspaceTreeNode } from "./fileTreeTypes";
import {
  hasPrimaryModifier,
  loadFolderNodes,
  pruneNestedPaths,
  replaceNodeChildren,
  uniqPaths,
} from "./fileTreeUtils";
import type { useFileTreeControllerCore } from "./useFileTreeControllerCore";

type FileTreeControllerCore = ReturnType<typeof useFileTreeControllerCore>;

export function useFileTreeNodeActions(core: FileTreeControllerCore) {
  const handleToggleFolder = useCallback(
    async (node: WorkspaceTreeNode) => {
      if (core.expandedSet.has(node.path)) {
        const nextExpandedPaths = core.expandedPaths.filter(
          (path) => !isSameOrChildPath(path, node.path),
        );
        core.setExpandedPaths(nextExpandedPaths);
        return;
      }

      const nextExpandedPaths = uniqPaths([...core.expandedPaths, node.path]);
      core.setExpandedPaths(nextExpandedPaths);

      if (node.isLoaded) {
        return;
      }

      core.setLoadingPath(node.path);

      try {
        const children = await loadFolderNodes(node.path);
        core.setTree((currentTree) =>
          replaceNodeChildren(currentTree, node.path, (currentNode) => ({
            ...currentNode,
            children,
            isLoaded: true,
          })),
        );
      } catch (loadError) {
        console.error("Ошибка при раскрытии папки", loadError);
        core.setError("Не удалось загрузить содержимое папки.");
      } finally {
        core.setLoadingPath(null);
      }
    },
    [core],
  );

  const handleOpenFile = useCallback(
    async (node: WorkspaceTreeNode) => {
      try {
        const content = await window.electronAPI.readFile(node.path);

        core.dispatch(
          openLocalFile({
            path: node.path,
            content: content ?? "",
          }),
        );
      } catch (loadError) {
        console.error("Ошибка при открытии файла", loadError);
        core.setError("Не удалось открыть выбранный файл.");
      }
    },
    [core],
  );

  const handleSelectNode = useCallback(
    (node: WorkspaceTreeNode, event: MouseEvent<HTMLDivElement>) => {
      core.focusExplorer();
      core.setContextMenu(null);
      core.setDeleteTarget(null);

      if (event.shiftKey) {
        const rangeStartPath = core.anchorPath ?? core.focusedPath ?? node.path;
        const rangeSelection = buildRangeSelection(core.visibleNodePaths, rangeStartPath, node.path);

        if (rangeSelection) {
          core.commitSelection(rangeSelection, node.path, rangeStartPath);
          return;
        }
      }

      if (hasPrimaryModifier(event)) {
        const nextSelectedPaths = core.selectedSet.has(node.path)
          ? core.selectedPaths.filter((path) => path !== node.path)
          : [...core.selectedPaths, node.path];
        core.commitSelection(uniqPaths(nextSelectedPaths), node.path, core.anchorPath ?? node.path);
        return;
      }

      core.commitSelection([node.path], node.path, node.path);
    },
    [core],
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
      const parentPath = parentPathOverride ?? core.resolveCreateParentPath();

      if (!parentPath) {
        return;
      }

      core.setDeleteTarget(null);
      core.setContextMenu(null);
      await core.ensureFolderVisible(parentPath);
      core.commitSelection([parentPath], parentPath, parentPath);
      core.setDraft({
        mode: "create",
        parentPath,
        nodeType,
        value: "",
      });
    },
    [core],
  );

  const beginRename = useCallback(
    (node?: WorkspaceTreeNode) => {
      const targetPath = node?.path ?? core.currentPrimarySelectionPath;
      const targetNode = node ?? (targetPath ? core.nodeByPath.get(targetPath) ?? null : null);

      if (!targetNode || targetNode.path === core.rootPath) {
        return;
      }

      if (!node && core.selectedPaths.length !== 1) {
        core.setError("Переименование доступно только для одного элемента.");
        return;
      }

      core.setDeleteTarget(null);
      core.setContextMenu(null);
      core.commitSelection([targetNode.path], targetNode.path, targetNode.path);
      core.setDraft({
        mode: "rename",
        targetPath: targetNode.path,
        parentPath: getParentPath(targetNode.path) ?? core.rootPath ?? targetNode.path,
        nodeType: targetNode.type,
        value: getBaseName(targetNode.path),
      });
    },
    [core],
  );

  const beginDelete = useCallback(
    (pathsOverride?: string[]) => {
      const basePaths = pathsOverride ?? core.selectedPaths;
      const normalizedPaths = pruneNestedPaths(basePaths).filter(
        (path) => path && path !== core.rootPath,
      );

      if (normalizedPaths.length === 0) {
        return;
      }

      const items = normalizedPaths
        .map((path) => {
          const currentNode = core.nodeByPath.get(path);

          if (!currentNode) {
            return null;
          }

          return {
            path: currentNode.path,
            name: currentNode.name,
            nodeType: currentNode.type,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (items.length === 0) {
        return;
      }

      const primaryPath = resolvePrimarySelectionPath(core.focusedPath, core.selectedPaths);
      const nextFocusPath =
        primaryPath && items.some((item) => item.path === primaryPath)
          ? primaryPath
          : items[0]?.path ?? null;

      core.setDraft(null);
      core.setContextMenu(null);
      core.commitSelection(
        items.map((item) => item.path),
        nextFocusPath,
        nextFocusPath,
      );
      core.setDeleteTarget({ items });
    },
    [core],
  );

  return {
    handleToggleFolder,
    handleOpenFile,
    handleSelectNode,
    handleNodeDoubleClick,
    beginCreate,
    beginRename,
    beginDelete,
  };
}
