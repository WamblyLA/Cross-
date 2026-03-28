import type { StateType } from "../../store/store";

export const selectFilesState = (state: StateType) => state.files;
export const selectOpenedFiles = (state: StateType) => state.files.openedFiles;
export const selectActiveTabId = (state: StateType) => state.files.activeTabId;
export const selectActiveFile = (state: StateType) =>
  state.files.openedFiles.find((file) => file.tabId === state.files.activeTabId) ?? null;
export const selectOpenedCloudFile = (state: StateType, projectId: string, fileId: string) =>
  state.files.openedFiles.find(
    (file) => file.kind === "cloud" && file.projectId === projectId && file.fileId === fileId,
  ) ?? null;
