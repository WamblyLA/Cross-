import type { StateType } from "../../store/store";

export const selectCloudState = (state: StateType) => state.cloud;
export const selectCloudProjects = (state: StateType) => state.cloud.projects;
export const selectCloudProjectsStatus = (state: StateType) => state.cloud.projectsStatus;
export const selectCloudProjectsError = (state: StateType) => state.cloud.projectsError;
export const selectCloudActiveProjectId = (state: StateType) => state.cloud.activeProjectId;
export const selectCloudActiveProject = (state: StateType) =>
  state.cloud.projects.find((project) => project.id === state.cloud.activeProjectId) ?? null;
export const selectCloudProjectById = (state: StateType, projectId: string | null) =>
  projectId ? state.cloud.projects.find((project) => project.id === projectId) ?? null : null;
export const selectCloudActiveProjectTree = (state: StateType) =>
  state.cloud.activeProjectId ? state.cloud.treeByProjectId[state.cloud.activeProjectId] ?? null : null;
export const selectCloudTreeForProject = (state: StateType, projectId: string | null) =>
  projectId ? state.cloud.treeByProjectId[projectId] ?? null : null;
export const selectCloudActiveProjectFiles = (state: StateType) =>
  state.cloud.activeProjectId ? state.cloud.filesByProjectId[state.cloud.activeProjectId] ?? [] : [];
export const selectCloudFilesForProject = (state: StateType, projectId: string | null) =>
  projectId ? state.cloud.filesByProjectId[projectId] ?? [] : [];
export const selectCloudFilesStatus = (state: StateType, projectId: string | null) =>
  projectId ? state.cloud.filesStatusByProjectId[projectId] ?? "idle" : "idle";
export const selectCloudFilesError = (state: StateType, projectId: string | null) =>
  projectId ? state.cloud.filesErrorByProjectId[projectId] ?? null : null;
export const selectCloudSelectedProjectId = (state: StateType) => state.cloud.selectedProjectId;
export const selectCloudSelectedFolderId = (state: StateType) => state.cloud.selectedFolderId;
export const selectCloudSelectedFileId = (state: StateType) => state.cloud.selectedFileId;
export const selectCloudSelectedItemType = (state: StateType) => state.cloud.selectedItemType;
export const selectCloudSelectedItemCount = (state: StateType) => state.cloud.selectedItemCount;
export const selectCloudProjectActionPending = (state: StateType) =>
  state.cloud.projectActionPending;
export const selectCloudProjectActionTargetId = (state: StateType) =>
  state.cloud.projectActionTargetId;
export const selectCloudProjectActionError = (state: StateType) =>
  state.cloud.projectActionError;
export const selectCloudFolderActionPending = (state: StateType) =>
  state.cloud.folderActionPending;
export const selectCloudFolderActionTargetId = (state: StateType) =>
  state.cloud.folderActionTargetId;
export const selectCloudFolderActionError = (state: StateType) =>
  state.cloud.folderActionError;
export const selectCloudFileActionPending = (state: StateType) => state.cloud.fileActionPending;
export const selectCloudFileActionTargetId = (state: StateType) =>
  state.cloud.fileActionTargetId;
export const selectCloudFileActionError = (state: StateType) => state.cloud.fileActionError;
