import type { StateType } from "../../store/store";
import { parseCloudSelectionKey } from "./cloudSelection";

export const selectCloudState = (state: StateType) => state.cloud;
export const selectCloudProjects = (state: StateType) => state.cloud.projects;
export const selectCloudProjectsStatus = (state: StateType) => state.cloud.projectsStatus;
export const selectCloudProjectsError = (state: StateType) => state.cloud.projectsError;
export const selectCloudActiveProjectId = (state: StateType) => state.cloud.activeProjectId;
export const selectCloudActiveProject = (state: StateType) =>
  state.cloud.projects.find((project) => project.id === state.cloud.activeProjectId) ?? null;
export const selectCloudProjectById = (state: StateType, projectId: string | null) =>
  projectId ? state.cloud.projects.find((project) => project.id === projectId) ?? null : null;
export const selectCloudActiveProjectAccessRole = (state: StateType) =>
  selectCloudActiveProject(state)?.accessRole ?? null;
export const selectCloudCanManageMembers = (state: StateType) =>
  selectCloudActiveProject(state)?.accessRole === "owner";
export const selectCloudCanWriteProject = (state: StateType) => {
  const role = selectCloudActiveProject(state)?.accessRole;
  return role === "owner" || role === "editor";
};
export const selectCloudCanManageStructure = (state: StateType) =>
  selectCloudCanWriteProject(state);
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
export const selectCloudSelectedItemKeys = (state: StateType) => state.cloud.selectedItemKeys;
export const selectCloudFocusedItemKey = (state: StateType) => state.cloud.focusedItemKey;
export const selectCloudSelectionAnchorKey = (state: StateType) => state.cloud.selectionAnchorKey;
export const selectCloudSelectedItems = (state: StateType) =>
  state.cloud.selectedItemKeys
    .map((key) => parseCloudSelectionKey(key))
    .filter((item) => item !== null);
export const selectCloudSelectedProjectId = (state: StateType) => state.cloud.selectedProjectId;
export const selectCloudSelectedFolderId = (state: StateType) => state.cloud.selectedFolderId;
export const selectCloudSelectedFileId = (state: StateType) => state.cloud.selectedFileId;
export const selectCloudSelectedItemType = (state: StateType) => state.cloud.selectedItemType;
export const selectCloudSelectedItemCount = (state: StateType) => state.cloud.selectedItemCount;
export const selectCloudCanRenameSingle = (state: StateType) =>
  state.cloud.selectedItemCount === 1 &&
  (state.cloud.selectedItemType === "project"
    ? selectCloudActiveProject(state)?.accessRole === "owner"
    : selectCloudCanWriteProject(state)) &&
  (state.cloud.selectedItemType === "project" ||
    state.cloud.selectedItemType === "folder" ||
    state.cloud.selectedItemType === "file");
export const selectCloudCanDeleteSelection = (state: StateType) =>
  state.cloud.selectedItemCount > 0 &&
  (state.cloud.selectedItemType === "project"
    ? selectCloudActiveProject(state)?.accessRole === "owner"
    : selectCloudCanWriteProject(state)) &&
  (state.cloud.selectedItemType === "project" ||
    state.cloud.selectedItemType === "folder" ||
    state.cloud.selectedItemType === "file");
export const selectCloudCanMoveSelection = (state: StateType) =>
  state.cloud.selectedItemCount > 0 &&
  selectCloudCanWriteProject(state) &&
  (state.cloud.selectedItemType === "folder" || state.cloud.selectedItemType === "file");
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
