import { useCallback } from "react";
import {
  createCloudProject as createCloudProjectThunk,
  createCloudProjectFile as createCloudProjectFileThunk,
  createCloudProjectFolder as createCloudProjectFolderThunk,
  deleteCloudProject,
  deleteCloudProjectFile,
  deleteCloudProjectFolder as deleteCloudProjectFolderThunk,
  fetchProjectFile,
  fetchProjects,
  fetchProjectTree,
  renameCloudProject as renameCloudProjectThunk,
  renameCloudProjectFile as renameCloudProjectFileThunk,
  renameCloudProjectFolder as renameCloudProjectFolderThunk,
} from "../features/cloud/cloudThunks";
import {
  getUnsupportedFileOpenMessage,
  isEditorOpenSupported,
} from "../features/files/fileOpenSupport";
import {
  clearLocalFiles,
  closeCloudFile,
  closeCloudFiles,
  closeCloudFilesByProject,
  openCloudFile,
  renameCloudFileMetadata,
  setActiveFile,
} from "../features/files/filesSlice";
import { selectActiveFile, selectOpenedFiles } from "../features/files/filesSelectors";
import { setFolderOpenError, setRootPath } from "../features/workspace/workspaceSlice";
import { createApiError, normalizeApiError } from "../lib/api/errorNormalization";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useRunActions } from "./useRunActions";
import { useOpenedFilePersistence } from "./useOpenedFilePersistence";
import { useCloudWorkspaceHelpers } from "./workspace/useCloudWorkspaceHelpers";
import { useCloudMoveActions } from "./workspace/useCloudMoveActions";

export function useWorkspaceActions() {
  const dispatch = useAppDispatch();
  const activeFile = useAppSelector(selectActiveFile);
  const openedFiles = useAppSelector(selectOpenedFiles);
  const { runSelectedConfiguration } = useRunActions();
  const saveOpenedFile = useOpenedFilePersistence({ enforceCloudWriteAccess: true });
  const {
    activeProjectId,
    activeCloudProject,
    getCloudProject,
    assertCanWriteCloudProject,
    assertCanManageOwnedCloudProject,
    refreshProjectTrees,
    focusCloudItem,
    focusCloudSelection,
    retargetMovedCloudFiles,
  } = useCloudWorkspaceHelpers();
  const {
    deleteCloudSelection,
    moveCloudFile,
    moveCloudFolder,
    moveCloudSelection,
  } = useCloudMoveActions({
    assertCanWriteCloudProject,
    focusCloudItem,
    focusCloudSelection,
    refreshProjectTrees,
    retargetMovedCloudFiles,
  });

  const saveFileByTabId = useCallback(
    async (tabId: string) => {
      const targetFile = openedFiles.find((file) => file.tabId === tabId);

      if (!targetFile) {
        return {
          ok: false,
          message: "Файл для сохранения больше не открыт.",
        };
      }

      try {
        await saveOpenedFile(targetFile);

        return {
          ok: true,
        };
      } catch (error) {
        const apiError = normalizeApiError(error);

        return {
          ok: false,
          message: apiError.message,
        };
      }
    },
    [openedFiles, saveOpenedFile],
  );

  const openFolder = useCallback(async () => {
    try {
      const result = await window.electronAPI.openFolder();

      if (!result) {
        return null;
      }

      dispatch(clearLocalFiles());
      dispatch(setRootPath(result.folderPath));

      return result.folderPath;
    } catch (error) {
      console.error("Ошибка при открытии папки", error);
      dispatch(
        setFolderOpenError(
          "Не удалось открыть выбранную папку. Проверьте, что она существует и доступна, затем выберите другую папку.",
        ),
      );
      return null;
    }
  }, [dispatch]);

  const saveActiveFile = useCallback(async () => {
    if (!activeFile) {
      return {
        ok: false,
        message: "Нет активного файла для сохранения.",
      };
    }

    return saveFileByTabId(activeFile.tabId);
  }, [activeFile, saveFileByTabId]);

  const saveAllOpenedFiles = useCallback(async () => {
    const savableFiles = openedFiles.filter(
      (file) => file.isDirty && !(file.kind === "cloud" && file.canWrite === false),
    );

    if (savableFiles.length === 0) {
      return {
        ok: true as const,
        savedCount: 0,
        failedCount: 0,
        failures: [],
      };
    }

    const results = await Promise.all(
      savableFiles.map(async (file) => ({
        tabId: file.tabId,
        result: await saveFileByTabId(file.tabId),
      })),
    );
    const failures = results.filter((item) => !item.result.ok);

    return {
      ok: failures.length === 0,
      savedCount: results.length - failures.length,
      failedCount: failures.length,
      failures,
    };
  }, [openedFiles, saveFileByTabId]);

  const runActivePythonFile = useCallback(async () => {
    return runSelectedConfiguration();
  }, [runSelectedConfiguration]);

  const refreshCloudProjects = useCallback(async () => {
    await dispatch(fetchProjects()).unwrap();
    await refreshProjectTrees(activeProjectId);
  }, [activeProjectId, dispatch, refreshProjectTrees]);

  const openCloudProject = useCallback(
    async (projectId: string) => {
      focusCloudItem({
        projectId,
        itemType: "project",
      });

      return dispatch(fetchProjectTree({ projectId })).unwrap();
    },
    [dispatch, focusCloudItem],
  );

  const openCloudWorkspaceFile = useCallback(
    async (projectId: string, fileId: string, fileName?: string) => {
      if (fileName && !isEditorOpenSupported(fileName)) {
        throw createApiError(getUnsupportedFileOpenMessage(fileName), {
          code: "UNSUPPORTED_FILE_TYPE",
          status: 415,
        });
      }

      const existing = openedFiles.find(
        (file) => file.kind === "cloud" && file.projectId === projectId && file.fileId === fileId,
      );

      focusCloudItem({
        projectId,
        fileId,
        itemType: "file",
      });

      if (existing) {
        dispatch(setActiveFile(existing.tabId));
        return existing;
      }

      const response = await dispatch(fetchProjectFile({ projectId, fileId })).unwrap();

      if (!isEditorOpenSupported(response.file.name)) {
        throw createApiError(getUnsupportedFileOpenMessage(response.file.name), {
          code: "UNSUPPORTED_FILE_TYPE",
          status: 415,
        });
      }

      dispatch(
        openCloudFile({
          projectId,
          fileId: response.file.id,
          name: response.file.name,
          content: response.file.content,
          canWrite: response.file.canWrite ?? getCloudProject(projectId)?.accessRole !== "viewer",
          version: response.file.version,
          updatedAt: response.file.updatedAt,
        }),
      );

      return response.file;
    },
    [dispatch, focusCloudItem, getCloudProject, openedFiles],
  );

  const createCloudProject = useCallback(
    async (name: string) => {
      const response = await dispatch(createCloudProjectThunk({ name })).unwrap();
      focusCloudItem({
        projectId: response.project.id,
        itemType: "project",
      });
      return response.project;
    },
    [dispatch, focusCloudItem],
  );

  const renameCloudProject = useCallback(
    async (projectId: string, name: string) => {
      assertCanManageOwnedCloudProject(projectId);
      const response = await dispatch(renameCloudProjectThunk({ projectId, name })).unwrap();
      return response.project;
    },
    [assertCanManageOwnedCloudProject, dispatch],
  );

  const deleteWorkspaceCloudProject = useCallback(
    async (projectId: string) => {
      assertCanManageOwnedCloudProject(projectId);
      await dispatch(deleteCloudProject({ projectId })).unwrap();
      dispatch(closeCloudFilesByProject(projectId));
    },
    [assertCanManageOwnedCloudProject, dispatch],
  );

  const createCloudFile = useCallback(
    async (projectId: string, name: string, content = "", folderId?: string | null) => {
      assertCanWriteCloudProject(projectId);
      const response = await dispatch(
        createCloudProjectFileThunk({
          projectId,
          name,
          content,
          folderId,
        }),
      ).unwrap();

      await refreshProjectTrees(projectId);
      focusCloudItem({
        projectId,
        folderId: response.file.folderId ?? null,
        fileId: response.file.id,
        itemType: "file",
      });

      if (isEditorOpenSupported(response.file.name)) {
        dispatch(
          openCloudFile({
            projectId,
            fileId: response.file.id,
            name: response.file.name,
            content: response.file.content,
            canWrite: response.file.canWrite ?? true,
            version: response.file.version,
            updatedAt: response.file.updatedAt,
          }),
        );
      }

      return response.file;
    },
    [assertCanWriteCloudProject, dispatch, focusCloudItem, refreshProjectTrees],
  );

  const renameCloudFile = useCallback(
    async (projectId: string, fileId: string, name: string) => {
      assertCanWriteCloudProject(projectId);
      const response = await dispatch(
        renameCloudProjectFileThunk({
          projectId,
          fileId,
          name,
        }),
      ).unwrap();

      await refreshProjectTrees(projectId);

      dispatch(
        renameCloudFileMetadata({
          projectId,
          fileId,
          name: response.file.name,
        }),
      );

      return response.file;
    },
    [assertCanWriteCloudProject, dispatch, refreshProjectTrees],
  );

  const deleteCloudWorkspaceFile = useCallback(
    async (projectId: string, fileId: string) => {
      assertCanWriteCloudProject(projectId);
      await dispatch(deleteCloudProjectFile({ projectId, fileId })).unwrap();
      await refreshProjectTrees(projectId);
      dispatch(closeCloudFile({ projectId, fileId }));
    },
    [assertCanWriteCloudProject, dispatch, refreshProjectTrees],
  );

  const createCloudFolder = useCallback(
    async (projectId: string, name: string, parentId?: string | null) => {
      assertCanWriteCloudProject(projectId);
      const response = await dispatch(
        createCloudProjectFolderThunk({
          projectId,
          name,
          parentId,
        }),
      ).unwrap();

      await refreshProjectTrees(projectId);
      focusCloudItem({
        projectId,
        folderId: response.folder.id,
        itemType: "folder",
      });

      return response.folder;
    },
    [assertCanWriteCloudProject, dispatch, focusCloudItem, refreshProjectTrees],
  );

  const renameCloudFolder = useCallback(
    async (projectId: string, folderId: string, name: string) => {
      assertCanWriteCloudProject(projectId);
      const response = await dispatch(
        renameCloudProjectFolderThunk({
          projectId,
          folderId,
          name,
        }),
      ).unwrap();

      await refreshProjectTrees(projectId);

      return response.folder;
    },
    [assertCanWriteCloudProject, dispatch, refreshProjectTrees],
  );

  const deleteCloudFolder = useCallback(
    async (projectId: string, folderId: string) => {
      assertCanWriteCloudProject(projectId);
      const response = await dispatch(
        deleteCloudProjectFolderThunk({
          projectId,
          folderId,
        }),
      ).unwrap();

      await refreshProjectTrees(projectId);

      if (response.deletedFileIds.length > 0) {
        dispatch(
          closeCloudFiles({
            projectId,
            fileIds: response.deletedFileIds,
          }),
        );
      }

      return response;
    },
    [assertCanWriteCloudProject, dispatch, refreshProjectTrees],
  );

  return {
    activeFile,
    activeCloudProject,
    openFolder,
    saveActiveFile,
    saveAllOpenedFiles,
    saveFileByTabId,
    runActivePythonFile,
    refreshCloudProjects,
    openCloudProject,
    openCloudFile: openCloudWorkspaceFile,
    createCloudProject,
    renameCloudProject,
    deleteCloudProject: deleteWorkspaceCloudProject,
    createCloudFile,
    renameCloudFile,
    deleteCloudFile: deleteCloudWorkspaceFile,
    createCloudFolder,
    renameCloudFolder,
    deleteCloudFolder,
    deleteCloudSelection,
    moveCloudFile,
    moveCloudFolder,
    moveCloudSelection,
  };
}
