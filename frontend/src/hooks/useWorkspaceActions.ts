import { useCallback } from "react";
import {
  createCloudProject as createCloudProjectThunk,
  createCloudProjectFile as createCloudProjectFileThunk,
  deleteCloudProject,
  deleteCloudProjectFile,
  fetchProjectFile,
  fetchProjectFiles,
  fetchProjects,
  renameCloudProject as renameCloudProjectThunk,
  renameCloudProjectFile as renameCloudProjectFileThunk,
  saveCloudProjectFile,
} from "../features/cloud/cloudThunks";
import { selectCloudActiveProjectId, selectCloudProjects } from "../features/cloud/cloudSelectors";
import { selectCloudItem, setActiveProjectId } from "../features/cloud/cloudSlice";
import {
  clearLocalFiles,
  closeCloudFile,
  closeCloudFilesByProject,
  markFileSaved,
  openCloudFile,
  renameCloudFileMetadata,
  setActiveFile,
} from "../features/files/filesSlice";
import { selectActiveFile, selectOpenedFiles } from "../features/files/filesSelectors";
import { setRootPath, setWorkspaceSource } from "../features/workspace/workspaceSlice";
import { normalizeApiError } from "../lib/api/errorNormalization";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useDesktopActions } from "./useDesktopActions";

export function useWorkspaceActions() {
  const dispatch = useAppDispatch();
  const activeFile = useAppSelector(selectActiveFile);
  const openedFiles = useAppSelector(selectOpenedFiles);
  const projects = useAppSelector(selectCloudProjects);
  const activeProjectId = useAppSelector(selectCloudActiveProjectId);
  const { openTerminal, printTerminalMessage } = useDesktopActions();

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
      } else {
        await dispatch(
          saveCloudProjectFile({
            projectId: activeFile.projectId,
            fileId: activeFile.fileId,
            content: activeFile.content,
          }),
        ).unwrap();
      }

      dispatch(markFileSaved(activeFile.tabId));

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
    await openTerminal();

    if (!activeFile) {
      await printTerminalMessage("Нет активного файла для запуска.");
      return { ok: false };
    }

    if (activeFile.kind !== "local") {
      await printTerminalMessage("Запуск доступен только для локальных Python-файлов.");
      return { ok: false };
    }

    if (activeFile.extension?.toLowerCase() !== "py") {
      await printTerminalMessage(
        "Для локального запуска откройте активный Python-файл с расширением .py.",
      );
      return { ok: false };
    }

    if (activeFile.isDirty) {
      const saveResult = await saveActiveFile();

      if (!saveResult.ok) {
        await printTerminalMessage(
          saveResult.message ?? "Не удалось сохранить текущий файл перед запуском.",
        );
        return { ok: false };
      }
    }

    try {
      await window.electronAPI.runPythonInTerminal(activeFile.path);
      return { ok: true };
    } catch (error) {
      const message = normalizeApiError(error).message;
      await printTerminalMessage(message);
      return { ok: false };
    }
  }, [activeFile, openTerminal, printTerminalMessage, saveActiveFile]);

  const refreshCloudProjects = useCallback(async () => {
    await dispatch(fetchProjects()).unwrap();

    if (activeProjectId) {
      await dispatch(fetchProjectFiles({ projectId: activeProjectId })).unwrap();
    }
  }, [activeProjectId, dispatch]);

  const openCloudProject = useCallback(
    async (projectId: string) => {
      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        selectCloudItem({
          projectId,
          fileId: null,
          itemType: "project",
        }),
      );

      return dispatch(fetchProjectFiles({ projectId })).unwrap();
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
    async (projectId: string, name: string, content = "") => {
      const response = await dispatch(
        createCloudProjectFileThunk({
          projectId,
          name,
          content,
        }),
      ).unwrap();

      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        selectCloudItem({
          projectId,
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
      dispatch(closeCloudFile({ projectId, fileId }));
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
  };
}
