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
import { setRootPath, setWorkspaceSource } from "../features/workspace/workspaceSlice";
import { normalizeApiError } from "../lib/api/errorNormalization";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useRunActions } from "./useRunActions";

export function useWorkspaceActions() {
  const dispatch = useAppDispatch();
  const activeFile = useAppSelector(selectActiveFile);
  const openedFiles = useAppSelector(selectOpenedFiles);
  const projects = useAppSelector(selectCloudProjects);
  const activeProjectId = useAppSelector(selectCloudActiveProjectId);
  const { runSelectedConfiguration } = useRunActions();

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

    try {
      if (activeFile.kind === "local") {
        await window.electronAPI.writeFile(activeFile.path, activeFile.content);
        dispatch(markFileSaved(activeFile.tabId));
      } else {
        const savedViaRealtime = isCloudRealtimeHandlingFile(activeFile.fileId)
          ? await flushActiveCloudRealtimeUpdate(activeFile.fileId)
          : false;

        if (!savedViaRealtime) {
          const response = await dispatch(
            saveCloudProjectFile({
              projectId: activeFile.projectId,
              fileId: activeFile.fileId,
              content: activeFile.content,
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
        }
      }

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
  }, [activeFile, dispatch]);

  const runActivePythonFile = useCallback(async () => {
    return runSelectedConfiguration();
  }, [runSelectedConfiguration]);

  const refreshCloudProjects = useCallback(async () => {
    await dispatch(fetchProjects()).unwrap();

    if (activeProjectId) {
      await dispatch(fetchProjectTree({ projectId: activeProjectId })).unwrap();
    }
  }, [activeProjectId, dispatch]);

  const openCloudProject = useCallback(
    async (projectId: string) => {
      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        selectCloudItem({
          projectId,
          folderId: null,
          fileId: null,
          itemType: "project",
        }),
      );

      return dispatch(fetchProjectTree({ projectId })).unwrap();
    },
    [dispatch],
  );

  const openCloudWorkspaceFile = useCallback(
    async (projectId: string, fileId: string) => {
      const existing = openedFiles.find(
        (file) => file.kind === "cloud" && file.projectId === projectId && file.fileId === fileId,
      );

      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        selectCloudItem({
          projectId,
          folderId: null,
          fileId,
          itemType: "file",
        }),
      );

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
          version: response.file.version,
          updatedAt: response.file.updatedAt,
        }),
      );

      return response.file;
    },
    [dispatch, openedFiles],
  );

  const createCloudProject = useCallback(
    async (name: string) => {
      const response = await dispatch(createCloudProjectThunk({ name })).unwrap();
      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(response.project.id));
      dispatch(
        selectCloudItem({
          projectId: response.project.id,
          folderId: null,
          fileId: null,
          itemType: "project",
        }),
      );
      return response.project;
    },
    [dispatch],
  );

  const renameCloudProject = useCallback(
    async (projectId: string, name: string) => {
      const response = await dispatch(renameCloudProjectThunk({ projectId, name })).unwrap();
      return response.project;
    },
    [dispatch],
  );

  const deleteWorkspaceCloudProject = useCallback(
    async (projectId: string) => {
      await dispatch(deleteCloudProject({ projectId })).unwrap();
      dispatch(closeCloudFilesByProject(projectId));
    },
    [dispatch],
  );

  const createCloudFile = useCallback(
    async (projectId: string, name: string, content = "", folderId?: string | null) => {
      const response = await dispatch(
        createCloudProjectFileThunk({
          projectId,
          name,
          content,
          folderId,
        }),
      ).unwrap();

      await dispatch(fetchProjectTree({ projectId })).unwrap();

      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        selectCloudItem({
          projectId,
          folderId: response.file.folderId ?? null,
          fileId: response.file.id,
          itemType: "file",
        }),
      );
      dispatch(
        openCloudFile({
          projectId,
          fileId: response.file.id,
          name: response.file.name,
          content: response.file.content,
          version: response.file.version,
          updatedAt: response.file.updatedAt,
        }),
      );

      return response.file;
    },
    [dispatch],
  );

  const renameCloudFile = useCallback(
    async (projectId: string, fileId: string, name: string) => {
      const response = await dispatch(
        renameCloudProjectFileThunk({
          projectId,
          fileId,
          name,
        }),
      ).unwrap();

      await dispatch(fetchProjectTree({ projectId })).unwrap();

      dispatch(
        renameCloudFileMetadata({
          projectId,
          fileId,
          name: response.file.name,
        }),
      );

      return response.file;
    },
    [dispatch],
  );

  const deleteCloudWorkspaceFile = useCallback(
    async (projectId: string, fileId: string) => {
      await dispatch(deleteCloudProjectFile({ projectId, fileId })).unwrap();
      await dispatch(fetchProjectTree({ projectId })).unwrap();
      dispatch(closeCloudFile({ projectId, fileId }));
    },
    [dispatch],
  );

  const createCloudFolder = useCallback(
    async (projectId: string, name: string, parentId?: string | null) => {
      const response = await dispatch(
        createCloudProjectFolderThunk({
          projectId,
          name,
          parentId,
        }),
      ).unwrap();

      await dispatch(fetchProjectTree({ projectId })).unwrap();
      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        selectCloudItem({
          projectId,
          folderId: response.folder.id,
          fileId: null,
          itemType: "folder",
        }),
      );

      return response.folder;
    },
    [dispatch],
  );

  const renameCloudFolder = useCallback(
    async (projectId: string, folderId: string, name: string) => {
      const response = await dispatch(
        renameCloudProjectFolderThunk({
          projectId,
          folderId,
          name,
        }),
      ).unwrap();

      await dispatch(fetchProjectTree({ projectId })).unwrap();

      return response.folder;
    },
    [dispatch],
  );

  const deleteCloudFolder = useCallback(
    async (projectId: string, folderId: string) => {
      const response = await dispatch(
        deleteCloudProjectFolderThunk({
          projectId,
          folderId,
        }),
      ).unwrap();

      await dispatch(fetchProjectTree({ projectId })).unwrap();

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
    [dispatch],
  );

  const moveCloudFile = useCallback(
    async (
      projectId: string,
      fileId: string,
      targetProjectId: string,
      targetFolderId: string | null,
    ) => {
      const response = await dispatch(
        moveCloudProjectFileThunk({
          projectId,
          fileId,
          targetProjectId,
          targetFolderId,
        }),
      ).unwrap();

      const refreshRequests =
        projectId === targetProjectId
          ? [dispatch(fetchProjectTree({ projectId }))]
          : [
              dispatch(fetchProjectTree({ projectId })),
              dispatch(fetchProjectTree({ projectId: targetProjectId })),
            ];

      await Promise.all(refreshRequests.map((request) => request.unwrap()));

      if (projectId !== targetProjectId) {
        dispatch(
          retargetCloudFiles({
            items: [
              {
                sourceProjectId: projectId,
                targetProjectId,
                fileId: response.file.id,
                name: response.file.name,
              },
            ],
          }),
        );
      }

      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(targetProjectId));
      dispatch(
        selectCloudItem({
          projectId: targetProjectId,
          folderId: response.file.folderId ?? null,
          fileId: response.file.id,
          itemType: "file",
        }),
      );

      return response;
    },
    [dispatch],
  );

  const moveCloudFolder = useCallback(
    async (
      projectId: string,
      folderId: string,
      targetProjectId: string,
      targetParentId: string | null,
    ) => {
      const response = await dispatch(
        moveCloudProjectFolderThunk({
          projectId,
          folderId,
          targetProjectId,
          targetParentId,
        }),
      ).unwrap();

      const refreshRequests =
        projectId === targetProjectId
          ? [dispatch(fetchProjectTree({ projectId }))]
          : [
              dispatch(fetchProjectTree({ projectId })),
              dispatch(fetchProjectTree({ projectId: targetProjectId })),
            ];

      await Promise.all(refreshRequests.map((request) => request.unwrap()));

      if (projectId !== targetProjectId && response.movedFiles.length > 0) {
        dispatch(
          retargetCloudFiles({
            items: response.movedFiles.map((file) => ({
              sourceProjectId: projectId,
              targetProjectId,
              fileId: file.id,
              name: file.name,
            })),
          }),
        );
      }

      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(targetProjectId));
      dispatch(
        selectCloudItem({
          projectId: targetProjectId,
          folderId: response.folder.id,
          fileId: null,
          itemType: "folder",
        }),
      );

      return response;
    },
    [dispatch],
  );

  const deleteCloudSelection = useCallback(
    async (
      projectId: string,
      items: Array<
        Extract<CloudSelectionEntry, { itemType: "folder" }> |
          Extract<CloudSelectionEntry, { itemType: "file" }>
      >,
    ) => {
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

      await dispatch(fetchProjectTree({ projectId })).unwrap();

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
    [dispatch],
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

      const refreshRequests =
        projectId === targetProjectId
          ? [dispatch(fetchProjectTree({ projectId }))]
          : [
              dispatch(fetchProjectTree({ projectId })),
              dispatch(fetchProjectTree({ projectId: targetProjectId })),
            ];

      await Promise.all(refreshRequests.map((request) => request.unwrap()));

      if (retargetedFiles.length > 0) {
        dispatch(
          retargetCloudFiles({
            items: retargetedFiles,
          }),
        );
      }

      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(targetProjectId));
      dispatch(
        setCloudSelection({
          items: movedSelection,
          focusedItemKey: movedSelection[0]?.key ?? null,
          selectionAnchorKey: movedSelection[0]?.key ?? null,
        }),
      );
    },
    [dispatch],
  );

  const activeCloudProject = projects.find((project) => project.id === activeProjectId) ?? null;

  return {
    activeFile,
    activeCloudProject,
    openFolder,
    saveActiveFile,
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
