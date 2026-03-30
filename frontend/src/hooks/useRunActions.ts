import { useCallback, useMemo, useRef } from "react";
import * as cloudApi from "../features/cloud/cloudApi";
import { selectCloudActiveProject } from "../features/cloud/cloudSelectors";
import {
  flushActiveCloudRealtimeUpdate,
  isCloudRealtimeHandlingFile,
} from "../features/cloud/realtime/cloudRealtimeClient";
import { saveCloudProjectFile } from "../features/cloud/cloudThunks";
import { applyCloudFileSavedSnapshot, markFileSaved } from "../features/files/filesSlice";
import { selectActiveFile, selectOpenedFiles } from "../features/files/filesSelectors";
import type { OpenedFile } from "../features/files/fileTypes";
import { activateBottomPanelTab, showBottomPanel } from "../features/panel/panelSlice";
import {
  runConfigurationDialogClosed,
  runConfigurationDialogOpened,
  runConfigurationsFailed,
  runConfigurationsLoaded,
  runConfigurationsLoading,
  runErrorMessageSet,
  runSessionChanged,
  runToolsFailed,
  runToolsLoaded,
  runToolsLoading,
} from "../features/run/runSlice";
import {
  selectRunConfigurations,
  selectRunSelectedConfigurationId,
  selectRunWorkspaceKey,
  selectSelectedRunConfiguration,
} from "../features/run/runSelectors";
import {
  buildRunLaunchActiveFile,
  buildRunWorkspaceCacheKey,
  buildRunWorkspaceDescriptor,
  getRunConfigurationAvailability,
} from "../features/run/runUtils";
import type {
  RunConfiguration,
  RunConfigurationListResult,
  RunLaunchRequest,
} from "../features/run/runTypes";
import { normalizeApiError } from "../lib/api/errorNormalization";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { isSameOrChildPath } from "../utils/path";

function toRunErrorMessage(error: unknown, fallbackMessage: string) {
  const normalizedError = normalizeApiError(error);
  return normalizedError.message || fallbackMessage;
}

function resolveWorkspaceStateKey(
  workspaceDescriptor: ReturnType<typeof buildRunWorkspaceDescriptor>,
) {
  if (!workspaceDescriptor) {
    return null;
  }

  return workspaceDescriptor.scope === "local"
    ? `local:${workspaceDescriptor.rootPath}`
    : `cloud:${workspaceDescriptor.projectId}`;
}

export function useRunActions() {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const activeFile = useAppSelector(selectActiveFile);
  const openedFiles = useAppSelector(selectOpenedFiles);
  const activeCloudProject = useAppSelector(selectCloudActiveProject);
  const selectedConfiguration = useAppSelector(selectSelectedRunConfiguration);
  const selectedConfigurationId = useAppSelector(selectRunSelectedConfigurationId);
  const loadedWorkspaceKey = useAppSelector(selectRunWorkspaceKey);
  const loadedConfigurations = useAppSelector(selectRunConfigurations);
  const lastToolsKeyRef = useRef<string | null>(null);
  const activeFileKind = activeFile?.kind ?? null;
  const activeFilePath = activeFile?.kind === "local" ? activeFile.path : null;
  const activeFileProjectId = activeFile?.kind === "cloud" ? activeFile.projectId : null;
  const activeFileId = activeFile?.kind === "cloud" ? activeFile.fileId : null;
  const activeFileExtension = activeFile?.extension ?? null;
  const activeCloudProjectId = activeCloudProject?.id ?? null;
  const activeCloudProjectName = activeCloudProject?.name ?? null;
  const runActiveFile = useMemo(
    () => {
      if (!activeFileKind) {
        return null;
      }

      if (activeFileKind === "local" && activeFilePath) {
        return {
          kind: "local" as const,
          path: activeFilePath,
          extension: activeFileExtension,
        };
      }

      if (activeFileKind === "cloud" && activeFileProjectId && activeFileId) {
        return {
          kind: "cloud" as const,
          projectId: activeFileProjectId,
          fileId: activeFileId,
          extension: activeFileExtension,
        };
      }

      return null;
    },
    [
      activeFileExtension,
      activeFileId,
      activeFileKind,
      activeFilePath,
      activeFileProjectId,
    ],
  );
  const runActiveCloudProject = useMemo(
    () =>
      activeCloudProjectId && activeCloudProjectName
        ? {
            id: activeCloudProjectId,
            name: activeCloudProjectName,
          }
        : null,
    [activeCloudProjectId, activeCloudProjectName],
  );

  const workspaceDescriptor = useMemo(
    () =>
      buildRunWorkspaceDescriptor({
        source,
        rootPath,
        activeFile: runActiveFile,
        activeCloudProject: runActiveCloudProject,
      }),
    [source, rootPath, runActiveCloudProject, runActiveFile],
  );

  const workspaceCacheKey = useMemo(
    () => buildRunWorkspaceCacheKey(workspaceDescriptor),
    [workspaceDescriptor],
  );
  const workspaceStateKey = useMemo(
    () => resolveWorkspaceStateKey(workspaceDescriptor),
    [workspaceDescriptor],
  );

  const saveOpenedFile = useCallback(
    async (file: OpenedFile) => {
      if (!file.isDirty) {
        return;
      }

      if (file.kind === "local") {
        await window.electronAPI.writeFile(file.path, file.content);
        dispatch(markFileSaved(file.tabId));
      } else {
        const savedViaRealtime = isCloudRealtimeHandlingFile(file.fileId)
          ? await flushActiveCloudRealtimeUpdate(file.fileId)
          : false;

        if (!savedViaRealtime) {
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
        }
      }
    },
    [dispatch],
  );

  const saveRelevantFilesForRun = useCallback(
    async (configuration: RunConfiguration) => {
      if (configuration.kind === "python-project") {
        if (source === "cloud" && activeCloudProject) {
          const dirtyCloudFiles = openedFiles.filter(
            (file) =>
              file.kind === "cloud" &&
              file.projectId === activeCloudProject.id &&
              file.isDirty,
          );

          for (const file of dirtyCloudFiles) {
            await saveOpenedFile(file);
          }

          return;
        }

        if (source === "local" && rootPath) {
          const dirtyLocalFiles = openedFiles.filter(
            (file) =>
              file.kind === "local" &&
              file.isDirty &&
              isSameOrChildPath(file.path, rootPath),
          );

          for (const file of dirtyLocalFiles) {
            await saveOpenedFile(file);
          }
        }

        return;
      }

      if (activeFile?.isDirty) {
        await saveOpenedFile(activeFile);
      }
    },
    [activeCloudProject, activeFile, openedFiles, rootPath, saveOpenedFile, source],
  );

  const ensureConfigurationsLoaded = useCallback(
    async (options?: { force?: boolean }) => {
      if (!workspaceDescriptor || !workspaceStateKey) {
        dispatch(runConfigurationsFailed("Нет активного проекта или файла для запуска."));
        return null;
      }

      if (!options?.force && loadedWorkspaceKey === workspaceStateKey && loadedConfigurations.length > 0) {
        return {
          workspaceKey: loadedWorkspaceKey,
          selectedConfigId: selectedConfigurationId,
          configurations: loadedConfigurations,
        } satisfies RunConfigurationListResult;
      }

      dispatch(runConfigurationsLoading());

      try {
        const result = (await window.electronAPI.listRunConfigurations(
          workspaceDescriptor,
        )) as RunConfigurationListResult;

        dispatch(runConfigurationsLoaded(result));

        return result;
      } catch (error) {
        dispatch(
          runConfigurationsFailed(
            toRunErrorMessage(error, "Не удалось загрузить конфигурации запуска."),
          ),
        );
        return null;
      }
    },
    [
      dispatch,
      loadedConfigurations,
      loadedWorkspaceKey,
      selectedConfigurationId,
      workspaceDescriptor,
      workspaceStateKey,
    ],
  );

  const refreshRunTools = useCallback(
    async (options?: { force?: boolean }) => {
      const toolsKey = workspaceCacheKey ?? "no-workspace";

      if (!options?.force && lastToolsKeyRef.current === toolsKey) {
        return;
      }

      dispatch(runToolsLoading());

      try {
        const workspaceRootPath =
          workspaceDescriptor?.scope === "local" ? workspaceDescriptor.rootPath : null;
        const [interpreterResult, toolchainResult] = await Promise.all([
          window.electronAPI.listRunPythonInterpreters({ workspaceRootPath }),
          window.electronAPI.listRunCppToolchains(),
        ]);

        dispatch(
          runToolsLoaded({
            interpreters: interpreterResult.interpreters,
            toolchains: toolchainResult.toolchains,
          }),
        );
        lastToolsKeyRef.current = toolsKey;
      } catch (error) {
        dispatch(
          runToolsFailed(
            toRunErrorMessage(error, "Не удалось загрузить интерпретаторы и компиляторы."),
          ),
        );
      }
    },
    [dispatch, workspaceCacheKey, workspaceDescriptor],
  );

  const openRunConfigurationDialog = useCallback(async () => {
    dispatch(runConfigurationDialogOpened());
    await Promise.all([ensureConfigurationsLoaded(), refreshRunTools()]);
  }, [dispatch, ensureConfigurationsLoaded, refreshRunTools]);

  const closeRunConfigurationDialog = useCallback(() => {
    dispatch(runConfigurationDialogClosed());
  }, [dispatch]);

  const selectConfiguration = useCallback(
    async (configurationId: string) => {
      if (!workspaceDescriptor) {
        return null;
      }

      try {
        const result = (await window.electronAPI.selectRunConfiguration(
          workspaceDescriptor,
          configurationId,
        )) as RunConfigurationListResult;
        dispatch(runConfigurationsLoaded(result));
        return result;
      } catch (error) {
        dispatch(
          runErrorMessageSet(
            toRunErrorMessage(error, "Не удалось выбрать конфигурацию запуска."),
          ),
        );
        return null;
      }
    },
    [dispatch, workspaceDescriptor],
  );

  const createProjectConfiguration = useCallback(async () => {
    if (!workspaceDescriptor) {
      return null;
    }

    try {
      const result = (await window.electronAPI.createRunConfiguration(workspaceDescriptor, {
        kind: "python-project",
        language: "python",
        mode: "project",
        name: "Python: проект",
        workingDirectoryMode: "project-root",
        interpreterPath: "auto",
        argumentsText: "",
        environmentText: "",
        compilerArgumentsText: "",
        entrypoint: "",
      })) as RunConfigurationListResult;

      dispatch(runConfigurationsLoaded(result));

      return result;
    } catch (error) {
      dispatch(
        runErrorMessageSet(
          toRunErrorMessage(error, "Не удалось создать конфигурацию запуска."),
        ),
      );
      return null;
    }
  }, [dispatch, workspaceDescriptor]);

  const updateConfiguration = useCallback(
    async (configuration: RunConfiguration) => {
      if (!workspaceDescriptor) {
        return null;
      }

      try {
        const result = (await window.electronAPI.updateRunConfiguration(
          workspaceDescriptor,
          configuration,
        )) as RunConfigurationListResult;
        dispatch(runConfigurationsLoaded(result));
        return result;
      } catch (error) {
        dispatch(
          runErrorMessageSet(
            toRunErrorMessage(error, "Не удалось обновить конфигурацию запуска."),
          ),
        );
        return null;
      }
    },
    [dispatch, workspaceDescriptor],
  );

  const deleteConfiguration = useCallback(
    async (configurationId: string) => {
      if (!workspaceDescriptor) {
        return null;
      }

      try {
        const result = (await window.electronAPI.deleteRunConfiguration(
          workspaceDescriptor,
          configurationId,
        )) as RunConfigurationListResult;
        dispatch(runConfigurationsLoaded(result));
        return result;
      } catch (error) {
        dispatch(
          runErrorMessageSet(
            toRunErrorMessage(error, "Не удалось удалить конфигурацию запуска."),
          ),
        );
        return null;
      }
    },
    [dispatch, workspaceDescriptor],
  );

  const buildLaunchRequest = useCallback(
    async (configuration: RunConfiguration): Promise<RunLaunchRequest | null> => {
      if (!workspaceDescriptor) {
        dispatch(runErrorMessageSet("Нет активного проекта или файла для запуска."));
        return null;
      }

      const availability = getRunConfigurationAvailability(configuration, {
        workspaceDescriptor,
        activeFile,
      });

      if (!availability.available) {
        dispatch(
          runErrorMessageSet(
            availability.reason ?? "Выбранная конфигурация сейчас недоступна.",
          ),
        );
        return null;
      }

      await saveRelevantFilesForRun(configuration);

      let cloudSnapshot = null;

      if (workspaceDescriptor.scope === "cloud") {
        const snapshotResponse = await cloudApi.getProjectRunSnapshot(
          workspaceDescriptor.projectId,
        );
        cloudSnapshot = snapshotResponse.snapshot;
      }

      return {
        workspace: workspaceDescriptor,
        configurationId: configuration.id,
        activeFile: buildRunLaunchActiveFile(activeFile),
        cloudSnapshot,
      };
    },
    [activeFile, dispatch, saveRelevantFilesForRun, workspaceDescriptor],
  );

  const runSelectedConfiguration = useCallback(async () => {
    const configuration =
      selectedConfiguration ??
      (await ensureConfigurationsLoaded())?.configurations.find(
        (item) => item.id === selectedConfigurationId,
      ) ??
      null;

    if (!configuration) {
      dispatch(runErrorMessageSet("Активная конфигурация запуска не найдена."));
      return { ok: false };
    }

    try {
      const launchRequest = await buildLaunchRequest(configuration);

      if (!launchRequest) {
        return { ok: false };
      }

      const result = await window.electronAPI.startRunSession(launchRequest);

      if (result.session) {
        dispatch(runSessionChanged(result.session));
      }

      dispatch(showBottomPanel("run"));
      dispatch(runErrorMessageSet(null));

      return { ok: true };
    } catch (error) {
      dispatch(
        runErrorMessageSet(
          toRunErrorMessage(error, "Не удалось запустить выбранную конфигурацию."),
        ),
      );
      return { ok: false };
    }
  }, [
    buildLaunchRequest,
    dispatch,
    ensureConfigurationsLoaded,
    selectedConfiguration,
    selectedConfigurationId,
  ]);

  const stopRun = useCallback(async () => {
    try {
      const result = await window.electronAPI.stopRunSession();

      if (result.session) {
        dispatch(runSessionChanged(result.session));
      }

      dispatch(activateBottomPanelTab("run"));
      return { ok: true };
    } catch (error) {
      dispatch(
        runErrorMessageSet(toRunErrorMessage(error, "Не удалось остановить запуск.")),
      );
      return { ok: false };
    }
  }, [dispatch]);

  const rerun = useCallback(async () => {
    try {
      const result = await window.electronAPI.rerunRunSession();

      if (result.session) {
        dispatch(runSessionChanged(result.session));
      }

      dispatch(showBottomPanel("run"));
      dispatch(runErrorMessageSet(null));
      return { ok: true };
    } catch (error) {
      dispatch(
        runErrorMessageSet(toRunErrorMessage(error, "Не удалось перезапустить выполнение.")),
      );
      return { ok: false };
    }
  }, [dispatch]);

  return {
    workspaceDescriptor,
    workspaceCacheKey,
    selectedConfiguration,
    ensureConfigurationsLoaded,
    refreshRunTools,
    openRunConfigurationDialog,
    closeRunConfigurationDialog,
    selectConfiguration,
    createProjectConfiguration,
    updateConfiguration,
    deleteConfiguration,
    runSelectedConfiguration,
    stopRun,
    rerun,
  };
}
