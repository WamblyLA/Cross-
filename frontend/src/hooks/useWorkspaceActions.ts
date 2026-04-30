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
  moveCloudProjectFile as moveCloudProjectFileThunk,
  moveCloudProjectFolder as moveCloudProjectFolderThunk,
  renameCloudProject as renameCloudProjectThunk,
  renameCloudProjectFile as renameCloudProjectFileThunk,
  renameCloudProjectFolder as renameCloudProjectFolderThunk,
  saveCloudProjectFile,
} from "../features/cloud/cloudThunks";
import { selectCloudActiveProjectId, selectCloudProjects } from "../features/cloud/cloudSelectors";
import {
  createCloudSelectionEntry,
  type CloudSelectionEntry,
} from "../features/cloud/cloudSelection";
import {
  selectCloudItem,
  setActiveProjectId,
  setCloudSelection,
} from "../features/cloud/cloudSlice";
import {
  applyCloudFileSavedSnapshot,
  clearLocalFiles,
  closeCloudFile,
  closeCloudFiles,
  closeCloudFilesByProject,
  markFileSaved,
  openCloudFile,
  renameCloudFileMetadata,
  retargetCloudFiles,
  setActiveFile,
} from "../features/files/filesSlice";
import {
  flushActiveCloudRealtimeUpdate,
  isCloudRealtimeHandlingFile,
} from "../features/cloud/realtime/cloudRealtimeClient";
import { selectActiveFile, selectOpenedFiles } from "../features/files/filesSelectors";
import {
  setFolderOpenError,
  setRootPath,
  setWorkspaceSource,
} from "../features/workspace/workspaceSlice";
import { createApiError, normalizeApiError } from "../lib/api/errorNormalization";
import { getReadOnlyCloudMessage } from "../features/cloud/projectCollaborationMessages";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useRunActions } from "./useRunActions";

type CloudWorkspaceTarget = {
  projectId: string;
  folderId?: string | null;
  fileId?: string | null;
  itemType: "project" | "folder" | "file";
};

type RetargetedCloudFile = {
  sourceProjectId: string;
  targetProjectId: string;
  fileId: string;
  name: string;
};

export function useWorkspaceActions() {
  const dispatch = useAppDispatch();
  const activeFile = useAppSelector(selectActiveFile);
  const openedFiles = useAppSelector(selectOpenedFiles);
  const projects = useAppSelector(selectCloudProjects);
  const activeProjectId = useAppSelector(selectCloudActiveProjectId);
  const { runSelectedConfiguration } = useRunActions();

  const getCloudProject = useCallback(
    (projectId: string) => projects.find((project) => project.id === projectId) ?? null,
    [projects],
  );

  const assertCanWriteCloudProject = useCallback(
    (projectId: string) => {
      const project = getCloudProject(projectId);

      if (!project) {
        throw createApiError("Проект не найден.", {
          code: "PROJECT_NOT_FOUND",
          status: 404,
        });
      }

      if (project.accessRole === "viewer") {
        throw createApiError(getReadOnlyCloudMessage(), {
          code: "FORBIDDEN",
          status: 403,
        });
      }

      return project;
    },
    [getCloudProject],
  );

  const assertCanManageOwnedCloudProject = useCallback(
    (projectId: string) => {
      const project = getCloudProject(projectId);

      if (!project) {
        throw createApiError("Проект не найден.", {
          code: "PROJECT_NOT_FOUND",
          status: 404,
        });
      }

      if (!project.isOwner) {
        throw createApiError("У вас нет прав на управление этим проектом.", {
          code: "FORBIDDEN",
          status: 403,
        });
      }

      return project;
    },
    [getCloudProject],
  );

  const refreshProjectTrees = useCallback(
    async (...projectIds: Array<string | null | undefined>) => {
      const uniqueProjectIds = Array.from(
        new Set(
          projectIds.filter((projectId): projectId is string => Boolean(projectId)),
        ),
      );

      await Promise.all(
        uniqueProjectIds.map((projectId) =>
          dispatch(fetchProjectTree({ projectId })).unwrap(),
        ),
      );
    },
    [dispatch],
  );

  const focusCloudItem = useCallback(
    ({ projectId, folderId = null, fileId = null, itemType }: CloudWorkspaceTarget) => {
      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        selectCloudItem({
          projectId,
          folderId,
          fileId,
          itemType,
        }),
      );
    },
    [dispatch],
  );

  const focusCloudSelection = useCallback(
    (projectId: string, items: CloudSelectionEntry[]) => {
      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        setCloudSelection({
          items,
          focusedItemKey: items[0]?.key ?? null,
          selectionAnchorKey: items[0]?.key ?? null,
        }),
      );
    },
    [dispatch],
  );

  const retargetMovedCloudFiles = useCallback(
    (items: RetargetedCloudFile[]) => {
      if (items.length === 0) {
        return;
      }

      dispatch(
        retargetCloudFiles({
          items,
        }),
      );
    },
    [dispatch],
  );

  const saveOpenedFile = useCallback(
    async (file: (typeof openedFiles)[number]) => {
      if (file.kind === "local") {
        await window.electronAPI.writeFile(file.path, file.content);
        dispatch(markFileSaved(file.tabId));
        return;
      }

      if (!file.canWrite) {
        throw createApiError(getReadOnlyCloudMessage(), {
          code: "FORBIDDEN",
          status: 403,
        });
      }

      const savedViaRealtime = isCloudRealtimeHandlingFile(file.fileId)
        ? await flushActiveCloudRealtimeUpdate(file.fileId)
        : false;

      if (savedViaRealtime) {
        return;
      }

      const response = await dispatch(
        saveCloudProjectFile({
          projectId: file.projectId,
          fileId: file.fileId,
          content: file.content,
        }),
      ).unwrap();

      dispatch(
        applyCloudFileSavedSnapshot({
          fileId: response.file.id,
          content: response.file.content,
          version: response.file.version,
          updatedAt: response.file.updatedAt,
        }),
      );
    },
    [dispatch],
  );

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
    async (projectId: string, fileId: string) => {
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

  const moveCloudFile = useCallback(
    async (
      projectId: string,
      fileId: string,
      targetProjectId: string,
      targetFolderId: string | null,
    ) => {
      assertCanWriteCloudProject(projectId);
      assertCanWriteCloudProject(targetProjectId);
      const response = await dispatch(
        moveCloudProjectFileThunk({
          projectId,
          fileId,
          targetProjectId,
          targetFolderId,
        }),
      ).unwrap();

      await refreshProjectTrees(projectId, targetProjectId);

      if (projectId !== targetProjectId) {
        retargetMovedCloudFiles([
          {
            sourceProjectId: projectId,
            targetProjectId,
            fileId: response.file.id,
            name: response.file.name,
          },
        ]);
      }

      focusCloudItem({
        projectId: targetProjectId,
        folderId: response.file.folderId ?? null,
        fileId: response.file.id,
        itemType: "file",
      });

      return response;
    },
    [assertCanWriteCloudProject, dispatch, focusCloudItem, refreshProjectTrees, retargetMovedCloudFiles],
  );

  const moveCloudFolder = useCallback(
    async (
      projectId: string,
      folderId: string,
      targetProjectId: string,
      targetParentId: string | null,
    ) => {
      assertCanWriteCloudProject(projectId);
      assertCanWriteCloudProject(targetProjectId);
      const response = await dispatch(
        moveCloudProjectFolderThunk({
          projectId,
          folderId,
          targetProjectId,
          targetParentId,
        }),
      ).unwrap();

      await refreshProjectTrees(projectId, targetProjectId);

      if (projectId !== targetProjectId && response.movedFiles.length > 0) {
        retargetMovedCloudFiles(
          response.movedFiles.map((file) => ({
            sourceProjectId: projectId,
            targetProjectId,
            fileId: file.id,
            name: file.name,
          })),
        );
      }

      focusCloudItem({
        projectId: targetProjectId,
        folderId: response.folder.id,
        itemType: "folder",
      });

      return response;
    },
    [assertCanWriteCloudProject, dispatch, focusCloudItem, refreshProjectTrees, retargetMovedCloudFiles],
  );

  const deleteCloudSelection = useCallback(
    async (
      projectId: string,
      items: Array<
        Extract<CloudSelectionEntry, { itemType: "folder" }> |
          Extract<CloudSelectionEntry, { itemType: "file" }>
      >,
    ) => {
      assertCanWriteCloudProject(projectId);
      const deletedFileIds = new Set<string>();

      for (const item of items) {
        if (item.itemType === "folder") {
          const response = await dispatch(
            deleteCloudProjectFolderThunk({
              projectId,
              folderId: item.folderId,
            }),
          ).unwrap();

          response.deletedFileIds.forEach((fileId) => deletedFileIds.add(fileId));
          continue;
        }

        await dispatch(
          deleteCloudProjectFile({
            projectId,
            fileId: item.fileId,
          }),
        ).unwrap();
        deletedFileIds.add(item.fileId);
      }

      await refreshProjectTrees(projectId);

      if (deletedFileIds.size > 0) {
        dispatch(
          closeCloudFiles({
            projectId,
            fileIds: Array.from(deletedFileIds),
          }),
        );
      }

      dispatch(
        setCloudSelection({
          items: [createCloudSelectionEntry({ itemType: "project", projectId })],
        }),
      );
    },
    [assertCanWriteCloudProject, dispatch, refreshProjectTrees],
  );

  const moveCloudSelection = useCallback(
    async (
      projectId: string,
      items: Array<
        Extract<CloudSelectionEntry, { itemType: "folder" }> |
          Extract<CloudSelectionEntry, { itemType: "file" }>
      >,
      targetProjectId: string,
      targetFolderId: string | null,
    ) => {
      assertCanWriteCloudProject(projectId);
      assertCanWriteCloudProject(targetProjectId);
      const movedSelection: CloudSelectionEntry[] = [];
      const retargetedFiles: {
        sourceProjectId: string;
        targetProjectId: string;
        fileId: string;
        name: string;
      }[] = [];

      for (const item of items) {
        if (item.itemType === "folder") {
          const response = await dispatch(
            moveCloudProjectFolderThunk({
              projectId,
              folderId: item.folderId,
              targetProjectId,
              targetParentId: targetFolderId,
            }),
          ).unwrap();

          movedSelection.push(
            createCloudSelectionEntry({
              itemType: "folder",
              projectId: targetProjectId,
              folderId: response.folder.id,
              parentId: response.folder.parentId,
              name: response.folder.name,
            }),
          );

          if (projectId !== targetProjectId && response.movedFiles.length > 0) {
            retargetedFiles.push(
              ...response.movedFiles.map((file) => ({
                sourceProjectId: projectId,
                targetProjectId,
                fileId: file.id,
                name: file.name,
              })),
            );
          }

          continue;
        }

        const response = await dispatch(
          moveCloudProjectFileThunk({
            projectId,
            fileId: item.fileId,
            targetProjectId,
            targetFolderId,
          }),
        ).unwrap();

        movedSelection.push(
          createCloudSelectionEntry({
            itemType: "file",
            projectId: targetProjectId,
            fileId: response.file.id,
            folderId: response.file.folderId ?? null,
            name: response.file.name,
          }),
        );

        if (projectId !== targetProjectId) {
          retargetedFiles.push({
            sourceProjectId: projectId,
            targetProjectId,
            fileId: response.file.id,
            name: response.file.name,
          });
        }
      }

      await refreshProjectTrees(projectId, targetProjectId);
      retargetMovedCloudFiles(retargetedFiles);
      focusCloudSelection(targetProjectId, movedSelection);
    },
    [assertCanWriteCloudProject, dispatch, focusCloudSelection, refreshProjectTrees, retargetMovedCloudFiles],
  );

  const activeCloudProject = projects.find((project) => project.id === activeProjectId) ?? null;

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
