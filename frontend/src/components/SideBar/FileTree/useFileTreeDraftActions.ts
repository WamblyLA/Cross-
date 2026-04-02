import { useCallback } from "react";
import {
  closeLocalFilesByPrefix,
  openLocalFile,
  renameFilePath,
} from "../../../features/files/filesSlice";
import {
  getParentPath,
  isSameOrChildPath,
  replacePathPrefix,
} from "../../../utils/path";
import { pruneNestedPaths, uniqPaths } from "./fileTreeUtils";
import type { useFileTreeControllerCore } from "./useFileTreeControllerCore";

type FileTreeControllerCore = ReturnType<typeof useFileTreeControllerCore>;

export function useFileTreeDraftActions(core: FileTreeControllerCore) {
  const setDraftValue = useCallback(
    (value: string) => {
      core.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft));
    },
    [core],
  );

  const cancelDraft = useCallback(() => {
    core.setDraft(null);
  }, [core]);

  const handleDraftSubmit = useCallback(async () => {
    const draft = core.draft;

    if (!draft) {
      return;
    }

    const nextName = draft.value.trim();

    if (!nextName) {
      core.setDraft(null);
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
            ? uniqPaths([...core.expandedPaths, draft.parentPath, result.path])
            : uniqPaths([...core.expandedPaths, draft.parentPath]);

        core.setExpandedPaths(nextExpandedPaths);
        core.setDraft(null);
        await core.refreshTree(nextExpandedPaths);
        core.commitSelection([result.path], result.path, result.path);

        if (draft.nodeType === "file") {
          core.dispatch(
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
        core.expandedPaths.map((path) =>
          isSameOrChildPath(path, draft.targetPath)
            ? replacePathPrefix(path, draft.targetPath, result.path)
            : path,
        ),
      );

      core.setExpandedPaths(nextExpandedPaths);
      core.setDraft(null);
      core.dispatch(
        renameFilePath({
          oldPath: draft.targetPath,
          newPath: result.path,
        }),
      );
      core.commitSelection([result.path], result.path, result.path);
      await core.refreshTree(nextExpandedPaths);
    } catch (submitError) {
      console.error("Ошибка при изменении дерева файлов", submitError);
      core.setError(
        submitError instanceof Error ? submitError.message : "Не удалось выполнить операцию.",
      );
    }
  }, [core]);

  const confirmDelete = useCallback(async () => {
    if (!core.deleteTarget) {
      return;
    }

    const deletePaths = pruneNestedPaths(core.deleteTarget.items.map((item) => item.path));

    try {
      for (const targetPath of deletePaths) {
        await window.electronAPI.removeFileSystemItem(targetPath);
        core.dispatch(closeLocalFilesByPrefix(targetPath));
      }

      const fallbackPath = deletePaths[0]
        ? getParentPath(deletePaths[0]) ?? core.rootPath
        : core.rootPath;
      const nextExpandedPaths = core.expandedPaths.filter(
        (path) => !deletePaths.some((targetPath) => isSameOrChildPath(path, targetPath)),
      );

      core.setExpandedPaths(nextExpandedPaths);
      core.setDeleteTarget(null);
      core.setDraft(null);
      await core.refreshTree(nextExpandedPaths);

      if (fallbackPath && fallbackPath !== core.rootPath) {
        core.commitSelection([fallbackPath], fallbackPath, fallbackPath);
      } else {
        core.commitSelection([], null, null);
      }
    } catch (removeError) {
      console.error("Ошибка при удалении файла или папки", removeError);
      core.setError(
        removeError instanceof Error
          ? removeError.message
          : "Не удалось удалить выбранные элементы.",
      );
    }
  }, [core]);

  return {
    setDraftValue,
    cancelDraft,
    handleDraftSubmit,
    confirmDelete,
  };
}
