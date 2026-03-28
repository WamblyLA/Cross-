import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { logout, restoreSession } from "../auth/authThunks";
import { buildCloudEditorPath } from "../cloud/cloudTypes";
import {
  buildCloudOpenedFile,
  buildLocalOpenedFile,
  buildLocalTabId,
  type OpenedFile,
} from "./fileTypes";
import { getBaseName, getExtension, isSameOrChildPath, replacePathPrefix } from "../../utils/path";

type FilesState = {
  openedFiles: OpenedFile[];
  activeTabId: string | null;
};

const initialState: FilesState = {
  openedFiles: [],
  activeTabId: null,
};

function setFallbackActiveTab(state: FilesState) {
  state.activeTabId =
    state.openedFiles.length > 0 ? state.openedFiles[state.openedFiles.length - 1].tabId : null;
}

function closeByPredicate(state: FilesState, predicate: (file: OpenedFile) => boolean) {
  const removedTabIds = new Set(state.openedFiles.filter(predicate).map((file) => file.tabId));
  state.openedFiles = state.openedFiles.filter((file) => !removedTabIds.has(file.tabId));

  if (state.activeTabId && removedTabIds.has(state.activeTabId)) {
    setFallbackActiveTab(state);
  }
}

const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    openLocalFile(
      state,
      action: PayloadAction<{
        path: string;
        content: string;
      }>,
    ) {
      const nextTabId = buildLocalTabId(action.payload.path);
      const existing = state.openedFiles.find((file) => file.tabId === nextTabId);

      if (!existing) {
        state.openedFiles.push(buildLocalOpenedFile(action.payload.path, action.payload.content));
      }

      state.activeTabId = nextTabId;
    },
    openCloudFile(
      state,
      action: PayloadAction<{
        projectId: string;
        fileId: string;
        name: string;
        content: string;
      }>,
    ) {
      const nextFile = buildCloudOpenedFile(action.payload);
      const existing = state.openedFiles.find((file) => file.tabId === nextFile.tabId);

      if (!existing) {
        state.openedFiles.push(nextFile);
      }

      state.activeTabId = nextFile.tabId;
    },
    setActiveFile(state, action: PayloadAction<string | null>) {
      state.activeTabId = action.payload;
    },
    updateFileContent(
      state,
      action: PayloadAction<{
        tabId: string;
        content: string;
      }>,
    ) {
      const existing = state.openedFiles.find((file) => file.tabId === action.payload.tabId);

      if (!existing) {
        return;
      }

      existing.content = action.payload.content;
      existing.isDirty = true;
    },
    markFileDirty(state, action: PayloadAction<string>) {
      const existing = state.openedFiles.find((file) => file.tabId === action.payload);

      if (existing) {
        existing.isDirty = true;
      }
    },
    markFileSaved(state, action: PayloadAction<string>) {
      const existing = state.openedFiles.find((file) => file.tabId === action.payload);

      if (existing) {
        existing.isDirty = false;
      }
    },
    renameFilePath(
      state,
      action: PayloadAction<{
        oldPath: string;
        newPath: string;
      }>,
    ) {
      const previousActiveTabId = state.activeTabId;

      state.openedFiles = state.openedFiles.map((file) => {
        if (file.kind !== "local" || !isSameOrChildPath(file.path, action.payload.oldPath)) {
          return file;
        }

        const nextPath = replacePathPrefix(file.path, action.payload.oldPath, action.payload.newPath);

        return {
          ...file,
          tabId: buildLocalTabId(nextPath),
          editorPath: nextPath,
          path: nextPath,
          name: getBaseName(nextPath),
          extension: getExtension(nextPath),
        };
      });

      if (!previousActiveTabId) {
        return;
      }

      const previousActivePath = previousActiveTabId.replace(/^local:/, "");

      if (isSameOrChildPath(previousActivePath, action.payload.oldPath)) {
        const nextActivePath = replacePathPrefix(
          previousActivePath,
          action.payload.oldPath,
          action.payload.newPath,
        );
        state.activeTabId = buildLocalTabId(nextActivePath);
      }
    },
    renameCloudFileMetadata(
      state,
      action: PayloadAction<{
        projectId: string;
        fileId: string;
        name: string;
      }>,
    ) {
      state.openedFiles = state.openedFiles.map((file) => {
        if (
          file.kind !== "cloud" ||
          file.projectId !== action.payload.projectId ||
          file.fileId !== action.payload.fileId
        ) {
          return file;
        }

        return {
          ...file,
          name: action.payload.name,
          extension: getExtension(action.payload.name),
          editorPath: buildCloudEditorPath(
            action.payload.projectId,
            action.payload.fileId,
            action.payload.name,
          ),
        };
      });
    },
    closeFile(state, action: PayloadAction<string>) {
      closeByPredicate(state, (file) => file.tabId === action.payload);
    },
    closeLocalFilesByPrefix(state, action: PayloadAction<string>) {
      closeByPredicate(
        state,
        (file) => file.kind === "local" && isSameOrChildPath(file.path, action.payload),
      );
    },
    closeCloudFilesByProject(state, action: PayloadAction<string>) {
      closeByPredicate(
        state,
        (file) => file.kind === "cloud" && file.projectId === action.payload,
      );
    },
    closeCloudFile(
      state,
      action: PayloadAction<{
        projectId: string;
        fileId: string;
      }>,
    ) {
      closeByPredicate(
        state,
        (file) =>
          file.kind === "cloud" &&
          file.projectId === action.payload.projectId &&
          file.fileId === action.payload.fileId,
      );
    },
    clearLocalFiles(state) {
      closeByPredicate(state, (file) => file.kind === "local");
    },
    clearCloudFiles(state) {
      closeByPredicate(state, (file) => file.kind === "cloud");
    },
    clearFiles(state) {
      state.openedFiles = [];
      state.activeTabId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout.fulfilled, (state) => {
        closeByPredicate(state, (file) => file.kind === "cloud");
      })
      .addCase(restoreSession.rejected, (state) => {
        closeByPredicate(state, (file) => file.kind === "cloud");
      });
  },
});

export const {
  openLocalFile,
  openCloudFile,
  setActiveFile,
  updateFileContent,
  markFileDirty,
  markFileSaved,
  renameFilePath,
  renameCloudFileMetadata,
  closeFile,
  closeLocalFilesByPrefix,
  closeCloudFilesByProject,
  closeCloudFile,
  clearLocalFiles,
  clearCloudFiles,
  clearFiles,
} = filesSlice.actions;

export default filesSlice.reducer;
