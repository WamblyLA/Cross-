import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createApiError, type ApiError } from "../../lib/api/errorNormalization";
import { login, logout, register, restoreSession } from "../auth/authThunks";
import {
  createCloudProject,
  createCloudProjectFile,
  createCloudProjectFolder,
  deleteCloudProject,
  deleteCloudProjectFile,
  deleteCloudProjectFolder,
  fetchProject,
  fetchProjectFile,
  fetchProjectFiles,
  fetchProjects,
  fetchProjectTree,
  moveCloudProjectFile,
  moveCloudProjectFolder,
  renameCloudProject,
  renameCloudProjectFile,
  renameCloudProjectFolder,
  saveCloudProjectFile,
} from "./cloudThunks";
import type { CloudProjectsState, CloudSelectionType } from "./cloudTypes";
import { flattenCloudTreeFiles } from "./cloudTypes";

function resolveError(error: ApiError | undefined, fallbackMessage: string) {
  return error ?? createApiError(fallbackMessage);
}

const initialState: CloudProjectsState = {
  projects: [],
  projectsStatus: "idle",
  projectsError: null,
  activeProjectId: null,
  selectedProjectId: null,
  selectedFolderId: null,
  selectedFileId: null,
  selectedItemType: null,
  selectedItemCount: 0,
  filesByProjectId: {},
  treeByProjectId: {},
  filesStatusByProjectId: {},
  filesErrorByProjectId: {},
  projectActionPending: null,
  projectActionTargetId: null,
  projectActionError: null,
  folderActionPending: null,
  folderActionTargetId: null,
  folderActionError: null,
  fileActionPending: null,
  fileActionTargetId: null,
  fileActionError: null,
};

function updateSelection(
  state: CloudProjectsState,
  payload: {
    projectId: string | null;
    folderId?: string | null;
    fileId?: string | null;
    itemType: CloudSelectionType;
    count?: number;
  },
) {
  state.selectedProjectId = payload.projectId;
  state.selectedFolderId = payload.folderId ?? null;
  state.selectedFileId = payload.fileId ?? null;
  state.selectedItemType = payload.itemType;
  state.selectedItemCount =
    payload.count ?? (payload.itemType === null ? 0 : 1);
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
          folderId: null,
          fileId: null,
          itemType: null,
          count: 0,
        });
      }
    },
    selectCloudItem(
      state,
      action: PayloadAction<{
        projectId: string | null;
        folderId?: string | null;
        fileId?: string | null;
        itemType: CloudSelectionType;
        count?: number;
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
    clearFolderActionError(state) {
      state.folderActionError = null;
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
            folderId: null,
            fileId: null,
            itemType: null,
            count: 0,
          });
        }
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.projectsStatus = "failed";
        state.projectsError = resolveError(action.payload, "Не удалось загрузить облачные проекты.");
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
      .addCase(fetchProjectTree.pending, (state, action) => {
        state.filesStatusByProjectId[action.meta.arg.projectId] = "loading";
        state.filesErrorByProjectId[action.meta.arg.projectId] = null;
      })
      .addCase(fetchProjectTree.fulfilled, (state, action) => {
        state.treeByProjectId[action.payload.projectId] = action.payload.tree;
        state.filesByProjectId[action.payload.projectId] = flattenCloudTreeFiles(action.payload.tree);
        state.filesStatusByProjectId[action.payload.projectId] = "succeeded";
        state.filesErrorByProjectId[action.payload.projectId] = null;
      })
      .addCase(fetchProjectTree.rejected, (state, action) => {
        state.filesStatusByProjectId[action.meta.arg.projectId] = "failed";
        state.filesErrorByProjectId[action.meta.arg.projectId] = resolveError(
          action.payload,
          "Не удалось загрузить структуру облачного проекта.",
        );
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
        state.treeByProjectId[nextProject.id] = {
          projectId: nextProject.id,
          folders: [],
          files: [],
        };
        state.filesStatusByProjectId[nextProject.id] = "succeeded";
        state.filesErrorByProjectId[nextProject.id] = null;
        updateSelection(state, {
          projectId: nextProject.id,
          folderId: null,
          fileId: null,
          itemType: "project",
          count: 1,
        });
        state.projectActionPending = null;
        state.projectActionTargetId = null;
        state.projectActionError = null;
      })
      .addCase(createCloudProject.rejected, (state, action) => {
        state.projectActionPending = null;
        state.projectActionTargetId = null;
        state.projectActionError = resolveError(action.payload, "Не удалось создать облачный проект.");
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
        delete state.treeByProjectId[projectId];
        delete state.filesStatusByProjectId[projectId];
        delete state.filesErrorByProjectId[projectId];

        if (state.activeProjectId === projectId) {
          state.activeProjectId = null;
        }

        if (state.selectedProjectId === projectId) {
          updateSelection(state, {
            projectId: null,
            folderId: null,
            fileId: null,
            itemType: null,
            count: 0,
          });
        }

        state.projectActionPending = null;
        state.projectActionTargetId = null;
        state.projectActionError = null;
      })
      .addCase(deleteCloudProject.rejected, (state, action) => {
        state.projectActionPending = null;
        state.projectActionTargetId = action.meta.arg.projectId;
        state.projectActionError = resolveError(action.payload, "Не удалось удалить облачный проект.");
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
        state.fileActionError = resolveError(action.payload, "Не удалось открыть облачный файл.");
      })
      .addCase(createCloudProjectFile.pending, (state, action) => {
        state.fileActionPending = "create";
        state.fileActionTargetId = action.meta.arg.projectId;
        state.fileActionError = null;
      })
      .addCase(createCloudProjectFile.fulfilled, (state) => {
        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(createCloudProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.projectId;
        state.fileActionError = resolveError(action.payload, "Не удалось создать облачный файл.");
      })
      .addCase(renameCloudProjectFile.pending, (state, action) => {
        state.fileActionPending = "rename";
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = null;
      })
      .addCase(renameCloudProjectFile.fulfilled, (state) => {
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
      .addCase(saveCloudProjectFile.fulfilled, (state) => {
        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(saveCloudProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = resolveError(action.payload, "Не удалось сохранить облачный файл.");
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

        if (state.selectedFileId === fileId && state.selectedItemCount <= 1) {
          updateSelection(state, {
            projectId,
            folderId: null,
            fileId: null,
            itemType: "project",
            count: 1,
          });
        }

        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(deleteCloudProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = resolveError(action.payload, "Не удалось удалить облачный файл.");
      })
      .addCase(moveCloudProjectFile.pending, (state, action) => {
        state.fileActionPending = "move";
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = null;
      })
      .addCase(moveCloudProjectFile.fulfilled, (state) => {
        state.fileActionPending = null;
        state.fileActionTargetId = null;
        state.fileActionError = null;
      })
      .addCase(moveCloudProjectFile.rejected, (state, action) => {
        state.fileActionPending = null;
        state.fileActionTargetId = action.meta.arg.fileId;
        state.fileActionError = resolveError(action.payload, "Не удалось переместить облачный файл.");
      })
      .addCase(createCloudProjectFolder.pending, (state, action) => {
        state.folderActionPending = "create";
        state.folderActionTargetId = action.meta.arg.projectId;
        state.folderActionError = null;
      })
      .addCase(createCloudProjectFolder.fulfilled, (state) => {
        state.folderActionPending = null;
        state.folderActionTargetId = null;
        state.folderActionError = null;
      })
      .addCase(createCloudProjectFolder.rejected, (state, action) => {
        state.folderActionPending = null;
        state.folderActionTargetId = action.meta.arg.projectId;
        state.folderActionError = resolveError(action.payload, "Не удалось создать облачную папку.");
      })
      .addCase(renameCloudProjectFolder.pending, (state, action) => {
        state.folderActionPending = "rename";
        state.folderActionTargetId = action.meta.arg.folderId;
        state.folderActionError = null;
      })
      .addCase(renameCloudProjectFolder.fulfilled, (state) => {
        state.folderActionPending = null;
        state.folderActionTargetId = null;
        state.folderActionError = null;
      })
      .addCase(renameCloudProjectFolder.rejected, (state, action) => {
        state.folderActionPending = null;
        state.folderActionTargetId = action.meta.arg.folderId;
        state.folderActionError = resolveError(
          action.payload,
          "Не удалось переименовать облачную папку.",
        );
      })
      .addCase(deleteCloudProjectFolder.pending, (state, action) => {
        state.folderActionPending = "delete";
        state.folderActionTargetId = action.meta.arg.folderId;
        state.folderActionError = null;
      })
      .addCase(deleteCloudProjectFolder.fulfilled, (state, action) => {
        if (
          state.selectedItemType === "folder" &&
          state.selectedFolderId === action.payload.folderId &&
          state.selectedItemCount <= 1
        ) {
          updateSelection(state, {
            projectId: action.payload.projectId,
            folderId: null,
            fileId: null,
            itemType: "project",
            count: 1,
          });
        }

        state.folderActionPending = null;
        state.folderActionTargetId = null;
        state.folderActionError = null;
      })
      .addCase(deleteCloudProjectFolder.rejected, (state, action) => {
        state.folderActionPending = null;
        state.folderActionTargetId = action.meta.arg.folderId;
        state.folderActionError = resolveError(action.payload, "Не удалось удалить облачную папку.");
      })
      .addCase(moveCloudProjectFolder.pending, (state, action) => {
        state.folderActionPending = "move";
        state.folderActionTargetId = action.meta.arg.folderId;
        state.folderActionError = null;
      })
      .addCase(moveCloudProjectFolder.fulfilled, (state) => {
        state.folderActionPending = null;
        state.folderActionTargetId = null;
        state.folderActionError = null;
      })
      .addCase(moveCloudProjectFolder.rejected, (state, action) => {
        state.folderActionPending = null;
        state.folderActionTargetId = action.meta.arg.folderId;
        state.folderActionError = resolveError(action.payload, "Не удалось переместить облачную папку.");
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
  clearFolderActionError,
  clearFileActionError,
  clearCloudState,
} = cloudSlice.actions;

export default cloudSlice.reducer;
