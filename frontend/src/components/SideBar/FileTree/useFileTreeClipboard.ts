import { useCallback } from "react";
import { renameFilePath } from "../../../features/files/filesSlice";
import { getParentPath } from "../../../utils/path";
import { pruneNestedPaths, uniqPaths } from "./fileTreeUtils";
import type { useFileTreeControllerCore } from "./useFileTreeControllerCore";

type FileTreeControllerCore = ReturnType<typeof useFileTreeControllerCore>;

export function useFileTreeClipboard(core: FileTreeControllerCore) {
  const copySelectionToClipboard = useCallback(
    (mode: "copy" | "cut", pathsOverride?: string[]) => {
      const sourcePaths = pruneNestedPaths(pathsOverride ?? core.selectedPaths).filter(
        (path) => path !== core.rootPath,
      );

      if (sourcePaths.length === 0) {
        return;
      }

      core.setClipboard({
        mode,
        paths: sourcePaths,
      });
    },
    [core],
  );

  const resolvePasteTargetDirectory = useCallback(
    (pathOverride?: string) => {
      if (!core.rootPath) {
        return null;
      }

      const targetPath = pathOverride ?? core.currentPrimarySelectionPath;
      const targetNode = targetPath ? core.nodeByPath.get(targetPath) ?? null : null;

      if (targetNode?.type === "folder") {
        return targetNode.path;
      }

      if (targetNode?.type === "file") {
        return getParentPath(targetNode.path) ?? core.rootPath;
      }

      return core.rootPath;
    },
    [core],
  );

  const handlePaste = useCallback(
    async (targetPathOverride?: string) => {
      if (!core.clipboard) {
        return;
      }

      const targetDirectory = resolvePasteTargetDirectory(targetPathOverride);

      if (!targetDirectory) {
        return;
      }

      try {
        const operation =
          core.clipboard.mode === "copy"
            ? window.electronAPI.copyFileSystemItems
            : window.electronAPI.moveFileSystemItems;
        const result = await operation(core.clipboard.paths, targetDirectory);
        const nextExpandedPaths = uniqPaths([...core.expandedPaths, targetDirectory]);

        if (core.clipboard.mode === "cut") {
          core.clipboard.paths.forEach((sourcePath, index) => {
            const nextPath = result.paths[index];

            if (nextPath && nextPath !== sourcePath) {
              core.dispatch(
                renameFilePath({
                  oldPath: sourcePath,
                  newPath: nextPath,
                }),
              );
            }
          });
          core.setClipboard(null);
        }

        core.setExpandedPaths(nextExpandedPaths);
        await core.refreshTree(nextExpandedPaths);
        core.commitSelection(result.paths, result.paths[0] ?? null, result.paths[0] ?? null);
      } catch (pasteError) {
        console.error("Ошибка при вставке элементов", pasteError);
        core.setError(
          pasteError instanceof Error
            ? pasteError.message
            : "Не удалось вставить выбранные элементы.",
        );
      }
    },
    [core, resolvePasteTargetDirectory],
  );

  return {
    copySelectionToClipboard,
    handlePaste,
  };
}
