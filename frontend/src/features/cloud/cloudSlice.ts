import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createApiError, type ApiError } from "../../lib/api/errorNormalization";
import { login, logout, register, restoreSession } from "../auth/authThunks";
import {
  createCloudProject,
  createCloudProjectFile,
  deleteCloudProject,
  deleteCloudProjectFile,
  fetchProject,
  fetchProjectFile,
  fetchProjectFiles,
  fetchProjects,
  renameCloudProject,
  renameCloudProjectFile,
  saveCloudProjectFile,
} from "./cloudThunks";
import type { CloudProjectsState, CloudSelectionType } from "./cloudTypes";

function resolveError(error: ApiError | undefined, fallbackMessage: string) {
  return error ?? createApiError(fallbackMessage);
}

const initialState: CloudProjectsState = {
  projects: [],
  projectsStatus: "idle",
  projectsError: null,
  activeProjectId: null,
  selectedProjectId: null,
  selectedFileId: null,
  selectedItemType: null,
  filesByProjectId: {},
  filesStatusByProjectId: {},
  filesErrorByProjectId: {},
  projectActionPending: null,
  projectActionTargetId: null,
  projectActionError: null,
  fileActionPending: null,
  fileActionTargetId: null,
  fileActionError: null,
};

function updateSelection(
  state: CloudProjectsState,
  payload: { projectId: string | null; fileId?: string | null; itemType: CloudSelectionType },
) {
  state.selectedProjectId = payload.projectId;
  state.selectedFileId = payload.fileId ?? null;
  state.selectedItemType = payload.itemType;
}

const cloudSlice = createSlice({
  name: "cloud",
  initialState,
  reducers: {
    setActiveProjectId(state, action: PayloadAction<string | null>) {
      state.activeProjectId = action.payload;

      if (!action.payload) {
        updateSelection(state, {
          projectId: null,
          fileId: null,
          itemType: null,
        });
      }
    },
    selectCloudItem(
      state,
      action: PayloadAction<{
        projectId: string | null;
        fileId?: string | null;
        itemType: CloudSelectionType;
      }>,
    ) {
      updateSelection(state, action.payload);
    },
    clearProjectsError(state) {
      state.projectsError = null;
    },
    clearProjectActionError(state) {
      state.projectActionError = null;
    },
    clearFileActionError(state) {
      state.fileActionError = null;
    },
    clearCloudState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.projectsStatus = "loading";
        state.projectsError = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projects = action.payload.projects;
        state.projectsStatus = "succeeded";
        state.projectsError = null;

        const hasActiveProject = state.projects.some((project) => project.id === state.activeProjectId);

        if (!hasActiveProject) {
          state.activeProjectId = null;
        }

        const hasSelectedProject = state.projects.some(
          (project) => project.id === state.selectedProjectId,
        );

        if (!hasSelectedProject) {
          updateSelection(state, {
            projectId: null,
            fileId: null,
            itemType: null,
          });
        }
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.projectsStatus = "failed";
        state.projectsError = resolveError(
          action.payload,
          "Не удалось загрузить облачные проекты.",
        );
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        const nextProject = action.payload.project;
        const existingIndex = state.projects.findIndex((project) => project.id === nextProject.id);

        if (existingIndex >= 0) {
          state.projects[existingIndex] = nextProject;
        } else {
          state.projects.unshift(nextProject);
        }
      })
      .addCase(createCloudProject.pending, (state) => {
        state.projectActionPending = "create";
        state.projectActionTargetId = null;
        state.projectActionError = null;
      })
      .addCase(createCloudProject.fulfilled, (state, action) => {
        const nextProject = action.payload.project;
        state.projects.unshift(nextProject);
        state.activeProjectId = nextProject.id;
        state.filesByProjectId[nextProject.id] = [];
        state.filesStatusByProjectId[nextProject.id] = "succeeded";
        state.filesErrorByProjectId[nextProject.id] = null;
        updateSelection(state, {
          projectId: nextProject.id,
          fileId: null,
          itemType: "project",
        });
        state.projectActionPending = null;
        state.projectActionTargetId = null;
        state.projectActionError = null;
      })
      .addCase(createCloudProject.rejected, (state, action) => {
        state.projectActionPending = null;
        state.projectActionTargetId = null;
        state.projectActionError = resolveError(
          action.payload,
          "Не удалось создать облачный проект.",
        );
      })
      .addCase(renameCloudProject.pending, (state, action) => {
        state.projectActionPending = "rename";
        state.projectActionTargetId = action.meta.arg.projectId;
        state.projectActionError = null;
      })
      .addCase(renameCloudProject.fulfilled, (state, action) => {
        const nextProject = action.payload.project;
        state.projects = state.projects.map((project) =>
          project.id === nextProject.id ? nextProject : project,
        );
        state.projectActionPending = null;
        state.projectActionTargetId = null;
        state.projectActionError = null;
      })
      .addCase(renameCloudProject.rejected, (state, action) => {
        state.projectActionPending = null;
        state.projectActionTargetId = action.meta.arg.projectId;
        state.projectActionError = resolveError(
          action.payload,
          "Не удалось переименовать облачный проект.",
        );
      })
      .addCase(deleteCloudProject.pending, (state, action) => {
        state.projectActionPending = "delete";
        state.projectActionTargetId = action.meta.arg.projectId;
        state.projectActionError = null;
      })
      .addCase(deleteCloudProject.fulfilled, (state, action) => {
        const { projectId } = action.payload;
        state.projects = state.projects.filter((project) => project.id !== projectId);
        delete state.filesByProjectId[projectId];
        delete state.filesStatusByProjectId[projectId];
        delete state.filesErrorByProjectId[projectId];

        if (state.activeProjectId === projectId) {
          state.activeProjectId = null;
        }

        if (state.selectedProjectId === projectId) {
          updateSelection(state, {
            projectId: null,
            fileId: null,
            itemType: null,
          });
        }

        state.projectActionPending = null;
        state.projectActionTargetId = null;
        state.projectActionError = null;
      })
      .addCase(deleteCloudProject.rejected, (state, action) => {
        state.projectActionPending = null;
        state.projectActionTargetId = action.meta.arg.projectId;
        state.projectActionError = resolveError(
          action.payload,
          "Не удалось удалить облачный проект.",
        );
      })
      .addCase(fetchProjectFiles.pending, (state, action) => {
        state.filesStatusByProjectId[action.meta.arg.projectId] = "loading";
        state.filesErrorByProjectId[action.meta.arg.projectId] = null;
      })
      .addCase(fetchProjectFiles.fulfilled, (state, action) => {
        state.filesByProjectId[action.payload.projectId] = action.payload.files;
        state.filesStatusByProjectId[action.payload.projectId] = "succeeded";
        state.filesErrorByProjectId[action.payload.projectId] = null;
      })
      .addCase(fetchProjectFiles.rejected, (state, action) => {
        state.filesStatusByProjectId[action.meta.arg.projectId] = "failed";
        state.filesErrorByProjectId[action.meta.arg.projectId] = resolveError(
          action.payload,
          "Не удалось загрузить файлы облачного проекта.",
        );
      })
      .addCase(fetchProjectFile.pending, (state, action) => {
        state.fileActionPending = "open";
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = null;
      })
      .addCase(fetchProjectFile.fulfilled, (state) => {
        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(fetchProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = resolveError(
          action.payload,
          "Не удалось открыть облачный файл.",
        );
      })
      .addCase(createCloudProjectFile.pending, (state, action) => {
        state.fileActionPending = "create";
        state.fileActionTargetId = action.meta.arg.projectId;
        state.fileActionError = null;
      })
      .addCase(createCloudProjectFile.fulfilled, (state, action) => {
        const nextFile = action.payload.file;
        const existingFiles = state.filesByProjectId[nextFile.projectId] ?? [];
        state.filesByProjectId[nextFile.projectId] = [...existingFiles, nextFile];
        state.filesStatusByProjectId[nextFile.projectId] = "succeeded";
        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(createCloudProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.projectId;
        state.fileActionError = resolveError(
          action.payload,
          "Не удалось создать облачный файл.",
        );
      })
      .addCase(renameCloudProjectFile.pending, (state, action) => {
        state.fileActionPending = "rename";
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = null;
      })
      .addCase(renameCloudProjectFile.fulfilled, (state, action) => {
        const nextFile = action.payload.file;
        state.filesByProjectId[nextFile.projectId] =
          (state.filesByProjectId[nextFile.projectId] ?? []).map((file) =>
            file.id === nextFile.id ? nextFile : file,
          );
        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(renameCloudProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = resolveError(
          action.payload,
          "Не удалось переименовать облачный файл.",
        );
      })
      .addCase(saveCloudProjectFile.pending, (state, action) => {
        state.fileActionPending = "save";
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = null;
      })
      .addCase(saveCloudProjectFile.fulfilled, (state, action) => {
        const nextFile = action.payload.file;
        state.filesByProjectId[nextFile.projectId] =
          (state.filesByProjectId[nextFile.projectId] ?? []).map((file) =>
            file.id === nextFile.id ? nextFile : file,
          );
        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(saveCloudProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = resolveError(
          action.payload,
          "Не удалось сохранить облачный файл.",
        );
      })
      .addCase(deleteCloudProjectFile.pending, (state, action) => {
        state.fileActionPending = "delete";
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = null;
      })
      .addCase(deleteCloudProjectFile.fulfilled, (state, action) => {
        const { projectId, fileId } = action.payload;
        state.filesByProjectId[projectId] =
          (state.filesByProjectId[projectId] ?? []).filter((file) => file.id !== fileId);

        if (state.selectedFileId === fileId) {
          updateSelection(state, {
            projectId,
            fileId: null,
            itemType: "project",
          });
        }

        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(deleteCloudProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = resolveError(
          action.payload,
          "Не удалось удалить облачный файл.",
        );
      })
      .addCase(restoreSession.fulfilled, () => initialState)
      .addCase(restoreSession.rejected, () => initialState)
      .addCase(login.fulfilled, () => initialState)
      .addCase(register.fulfilled, () => initialState)
      .addCase(logout.fulfilled, () => initialState);
  },
});

export const {
  setActiveProjectId,
  selectCloudItem,
  clearProjectsError,
  clearProjectActionError,
  clearFileActionError,
  clearCloudState,
} = cloudSlice.actions;

export default cloudSlice.reducer;
