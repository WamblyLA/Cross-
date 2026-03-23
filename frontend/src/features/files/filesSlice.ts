import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  getBaseName,
  getExtension,
  isSameOrChildPath,
  replacePathPrefix,
} from "../../utils/path";

export interface OpenedFile {
  path: string;
  name: string;
  extension: string | null;
  content: string;
  isDirty: boolean;
}

type FilesState = {
  openedFiles: OpenedFile[];
  activeFilePath: string | null;
};

const initialState: FilesState = {
  openedFiles: [],
  activeFilePath: null,
};

function buildOpenedFile(path: string, content: string): OpenedFile {
  return {
    path,
    name: getBaseName(path),
    extension: getExtension(path),
    content,
    isDirty: false,
  };
}

const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    openFile(
      state,
      action: PayloadAction<{
        path: string;
        content: string;
      }>,
    ) {
      const existing = state.openedFiles.find((file) => file.path === action.payload.path);

      if (!existing) {
        state.openedFiles.push(buildOpenedFile(action.payload.path, action.payload.content));
      }

      state.activeFilePath = action.payload.path;
    },
    setActiveFile(state, action: PayloadAction<string | null>) {
      state.activeFilePath = action.payload;
    },
    updateFileContent(
      state,
      action: PayloadAction<{
        path: string;
        content: string;
      }>,
    ) {
      const existing = state.openedFiles.find((file) => file.path === action.payload.path);

      if (!existing) {
        return;
      }

      existing.content = action.payload.content;
      existing.isDirty = true;
    },
    markFileSaved(state, action: PayloadAction<string>) {
      const existing = state.openedFiles.find((file) => file.path === action.payload);

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
      state.openedFiles = state.openedFiles.map((file) => {
        if (!isSameOrChildPath(file.path, action.payload.oldPath)) {
          return file;
        }

        const nextPath = replacePathPrefix(
          file.path,
          action.payload.oldPath,
          action.payload.newPath,
        );

        return {
          ...file,
          path: nextPath,
          name: getBaseName(nextPath),
          extension: getExtension(nextPath),
        };
      });

      if (state.activeFilePath && isSameOrChildPath(state.activeFilePath, action.payload.oldPath)) {
        state.activeFilePath = replacePathPrefix(
          state.activeFilePath,
          action.payload.oldPath,
          action.payload.newPath,
        );
      }
    },
    closeFile(state, action: PayloadAction<string>) {
      const filtered = state.openedFiles.filter((file) => file.path !== action.payload);
      state.openedFiles = filtered;

      if (state.activeFilePath !== action.payload) {
        return;
      }

      state.activeFilePath = filtered.length > 0 ? filtered[filtered.length - 1].path : null;
    },
    closeFilesByPrefix(state, action: PayloadAction<string>) {
      const removedPaths = new Set(
        state.openedFiles
          .filter((file) => isSameOrChildPath(file.path, action.payload))
          .map((file) => file.path),
      );

      state.openedFiles = state.openedFiles.filter((file) => !removedPaths.has(file.path));

      if (state.activeFilePath && removedPaths.has(state.activeFilePath)) {
        state.activeFilePath =
          state.openedFiles.length > 0 ? state.openedFiles[state.openedFiles.length - 1].path : null;
      }
    },
    clearFiles(state) {
      state.openedFiles = [];
      state.activeFilePath = null;
    },
  },
});

export const {
  openFile,
  setActiveFile,
  updateFileContent,
  markFileSaved,
  renameFilePath,
  closeFile,
  closeFilesByPrefix,
  clearFiles,
} = filesSlice.actions;

export default filesSlice.reducer;
