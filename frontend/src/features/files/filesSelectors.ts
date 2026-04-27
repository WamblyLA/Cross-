import type { StateType } from "../../store/store";

export const selectOpenedFiles = (state: StateType) => state.files.openedFiles;
export const selectActiveTabId = (state: StateType) => state.files.activeTabId;
export const selectActiveFile = (state: StateType) =>
  state.files.openedFiles.find((file) => file.tabId === state.files.activeTabId) ?? null;
