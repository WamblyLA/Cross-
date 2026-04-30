import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { logout, restoreSession } from "../auth/authThunks";
import { buildCloudEditorPath, buildCloudTabId } from "../cloud/cloudTypes";
import type { CloudFileSyncStatus } from "../cloud/realtime/cloudRealtimeTypes";
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

function findCloudFile(state: FilesState, fileId: string) {
  const file = state.openedFiles.find(
    (item) => item.kind === "cloud" && item.fileId === fileId,
  );

  return file?.kind === "cloud" ? file : null;
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
        canWrite?: boolean;
        version: number;
        updatedAt?: string | null;
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

      if (existing.kind === "cloud" && existing.syncStatus === "live") {
        existing.syncStatus = "syncing";
      }
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

        if (existing.kind === "cloud") {
          existing.lastSyncedContent = existing.content;
        }
      }
    },
    applyLocalFileSavedSnapshot(
      state,
      action: PayloadAction<{
        path: string;
        content: string;
      }>,
    ) {
      const tabId = buildLocalTabId(action.payload.path);
      const existing = state.openedFiles.find(
        (file) => file.kind === "local" && file.tabId === tabId,
      );

      if (!existing || existing.kind !== "local") {
        return;
      }

      existing.content = action.payload.content;
      existing.isDirty = false;
    },
    setCloudFileSyncStatus(
      state,
      action: PayloadAction<{
        fileId: string;
        syncStatus: CloudFileSyncStatus;
      }>,
    ) {
      const existing = findCloudFile(state, action.payload.fileId);

      if (!existing) {
        return;
      }

      existing.syncStatus = action.payload.syncStatus;
    },
    setCloudFileJoinedVersion(
      state,
      action: PayloadAction<{
        fileId: string;
        version: number;
      }>,
    ) {
      const existing = findCloudFile(state, action.payload.fileId);

      if (!existing) {
        return;
      }

      existing.version = action.payload.version;
    },
    applyCloudFileRealtimeAck(
      state,
      action: PayloadAction<{
        fileId: string;
        acceptedContent: string | null;
        version: number;
        updatedAt: string;
      }>,
    ) {
      const existing = findCloudFile(state, action.payload.fileId);

      if (!existing) {
        return;
      }

      existing.version = action.payload.version;
      existing.updatedAt = action.payload.updatedAt;

      if (action.payload.acceptedContent !== null) {
        existing.lastSyncedContent = action.payload.acceptedContent;

        if (existing.content === action.payload.acceptedContent) {
          existing.isDirty = false;
        }
      }

      existing.syncStatus = existing.isDirty ? "syncing" : "live";
    },
    applyCloudFileRemoteUpdate(
      state,
      action: PayloadAction<{
        fileId: string;
        content: string;
        version: number;
        updatedAt: string;
      }>,
    ) {
      const existing = findCloudFile(state, action.payload.fileId);

      if (!existing) {
        return;
      }

      existing.version = action.payload.version;
      existing.updatedAt = action.payload.updatedAt;
      existing.lastSyncedContent = action.payload.content;
      existing.syncStatus = "live";

      if (existing.content === action.payload.content) {
        existing.isDirty = false;
        return;
      }

      existing.content = action.payload.content;
      existing.isDirty = false;
    },
    applyCloudFileSavedSnapshot(
      state,
      action: PayloadAction<{
        fileId: string;
        content: string;
        version: number;
        updatedAt: string;
      }>,
    ) {
      const existing = findCloudFile(state, action.payload.fileId);

      if (!existing) {
        return;
      }

      existing.version = action.payload.version;
      existing.updatedAt = action.payload.updatedAt;
      existing.lastSyncedContent = action.payload.content;
      existing.isDirty = false;

      if (existing.syncStatus === "error") {
        existing.syncStatus = "offline";
      } else if (existing.syncStatus === "live" || existing.syncStatus === "syncing") {
        existing.syncStatus = "live";
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
    retargetCloudFiles(
      state,
      action: PayloadAction<{
        items: {
          sourceProjectId: string;
          targetProjectId: string;
          fileId: string;
          name: string;
        }[];
      }>,
    ) {
      if (action.payload.items.length === 0) {
        return;
      }

      const moves = new Map(
        action.payload.items.map((item) => [`${item.sourceProjectId}:${item.fileId}`, item]),
      );
      const activeCloudFile =
        state.activeTabId === null
          ? null
          : state.openedFiles.find(
              (file) => file.kind === "cloud" && file.tabId === state.activeTabId,
            ) ?? null;

      state.openedFiles = state.openedFiles.map((file) => {
        if (file.kind !== "cloud") {
          return file;
        }

        const move = moves.get(`${file.projectId}:${file.fileId}`);

        if (!move) {
          return file;
        }

        return {
          ...file,
          tabId: buildCloudTabId(move.targetProjectId, file.fileId),
          editorPath: buildCloudEditorPath(move.targetProjectId, file.fileId, move.name),
          projectId: move.targetProjectId,
          name: move.name,
          extension: getExtension(move.name),
        };
      });

      if (activeCloudFile?.kind === "cloud") {
        const activeMove = moves.get(`${activeCloudFile.projectId}:${activeCloudFile.fileId}`);

        if (activeMove) {
          state.activeTabId = buildCloudTabId(activeMove.targetProjectId, activeCloudFile.fileId);
        }
      }
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
    closeLocalFileByPath(state, action: PayloadAction<string>) {
      closeByPredicate(
        state,
        (file) => file.kind === "local" && file.path === action.payload,
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
    closeCloudFiles(
      state,
      action: PayloadAction<{
        projectId: string;
        fileIds: string[];
      }>,
    ) {
      const fileIds = new Set(action.payload.fileIds);
      closeByPredicate(
        state,
        (file) =>
          file.kind === "cloud" &&
          file.projectId === action.payload.projectId &&
          fileIds.has(file.fileId),
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
  applyLocalFileSavedSnapshot,
  setCloudFileSyncStatus,
  setCloudFileJoinedVersion,
  applyCloudFileRealtimeAck,
  applyCloudFileRemoteUpdate,
  applyCloudFileSavedSnapshot,
  renameFilePath,
  renameCloudFileMetadata,
  retargetCloudFiles,
  closeFile,
  closeLocalFilesByPrefix,
  closeLocalFileByPath,
  closeCloudFilesByProject,
  closeCloudFile,
  closeCloudFiles,
  clearLocalFiles,
  clearCloudFiles,
  clearFiles,
} = filesSlice.actions;

export default filesSlice.reducer;
