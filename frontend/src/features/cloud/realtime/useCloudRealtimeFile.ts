import { useCallback, useEffect, useRef } from "react";
import {
  applyCloudFileRealtimeAck,
  applyCloudFileRemoteUpdate,
  setCloudFileJoinedVersion,
  setCloudFileSyncStatus,
} from "../../files/filesSlice";
import type { CloudOpenedFile, OpenedFile } from "../../files/fileTypes";
import { useAppDispatch } from "../../../store/hooks";
import {
  cloudRealtimeClient,
  registerActiveCloudRealtimeBridge,
} from "./cloudRealtimeClient";
import { isRealtimeSupportedCloudFileName } from "./cloudRealtimeSupport";
import type { CloudFileSyncStatus } from "./cloudRealtimeTypes";

const CLOUD_REALTIME_DEBOUNCE_MS = 200;

function toFileSyncStatus(
  transportStatus: ReturnType<typeof cloudRealtimeClient.getStatus>,
  file: CloudOpenedFile | null,
): CloudFileSyncStatus {
  if (!file) {
    return transportStatus;
  }

  if (transportStatus === "live" && file.content !== file.lastSyncedContent) {
    return "syncing";
  }

  return transportStatus;
}

function isRealtimeCloudFile(file: OpenedFile | null): file is CloudOpenedFile {
  return file?.kind === "cloud" && isRealtimeSupportedCloudFileName(file.name);
}

export function useCloudRealtimeFile(activeFile: OpenedFile | null) {
  const dispatch = useAppDispatch();
  const debounceTimerRef = useRef<number | null>(null);
  const remoteAppliedContentRef = useRef<string | null>(null);
  const activeCloudFileRef = useRef<CloudOpenedFile | null>(null);

  const realtimeFile = isRealtimeCloudFile(activeFile) ? activeFile : null;
  const realtimeFileId = realtimeFile?.fileId ?? null;
  const realtimeFileContent = realtimeFile?.content ?? null;
  const realtimeFileLastSyncedContent = realtimeFile?.lastSyncedContent ?? null;

  const clearPendingDebounce = useCallback(() => {
    if (debounceTimerRef.current === null) {
      return;
    }

    window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }, []);

  const updateFileSyncStatus = useCallback(
    (file: CloudOpenedFile | null, syncStatus: CloudFileSyncStatus) => {
      if (!file || file.syncStatus === syncStatus) {
        return;
      }

      dispatch(
        setCloudFileSyncStatus({
          fileId: file.fileId,
          syncStatus,
        }),
      );
    },
    [dispatch],
  );

  const flushPendingUpdate = useCallback(async () => {
    clearPendingDebounce();

    const file = activeCloudFileRef.current;

    if (!file) {
      return false;
    }

    if (file.content === file.lastSyncedContent) {
      if (cloudRealtimeClient.isLiveForFile(file.fileId)) {
        updateFileSyncStatus(file, "live");
        return true;
      }

      return false;
    }

    if (!cloudRealtimeClient.isLiveForFile(file.fileId)) {
      updateFileSyncStatus(file, cloudRealtimeClient.getStatus());
      return false;
    }

    updateFileSyncStatus(file, "syncing");

    try {
      await cloudRealtimeClient.sendContentUpdate({
        fileId: file.fileId,
        content: file.content,
        baseVersion: file.version,
      });
      return true;
    } catch {
      updateFileSyncStatus(file, cloudRealtimeClient.getStatus());
      return false;
    }
  }, [clearPendingDebounce, updateFileSyncStatus]);

  useEffect(() => {
    activeCloudFileRef.current = realtimeFile;
  }, [realtimeFile]);

  useEffect(() => {
    return cloudRealtimeClient.subscribe((event) => {
      switch (event.type) {
        case "status": {
          const file = activeCloudFileRef.current;

          if (!file) {
            return;
          }

          updateFileSyncStatus(file, toFileSyncStatus(event.payload.status, file));
          return;
        }

        case "joined":
          dispatch(
            setCloudFileJoinedVersion({
              fileId: event.payload.fileId,
              version: event.payload.version,
            }),
          );
          return;

        case "ack":
          dispatch(
            applyCloudFileRealtimeAck({
              fileId: event.payload.fileId,
              acceptedContent: event.payload.acceptedContent,
              version: event.payload.version,
              updatedAt: event.payload.updatedAt,
            }),
          );
          return;

        case "remote_update":
          if (activeCloudFileRef.current?.fileId === event.payload.fileId) {
            remoteAppliedContentRef.current = event.payload.content;
          }

          dispatch(
            applyCloudFileRemoteUpdate({
              fileId: event.payload.fileId,
              content: event.payload.content,
              version: event.payload.version,
              updatedAt: event.payload.updatedAt,
            }),
          );
          return;

        case "ws_error": {
          const file = activeCloudFileRef.current;

          if (!file) {
            return;
          }

          updateFileSyncStatus(file, "error");
        }
      }
    });
  }, [dispatch, updateFileSyncStatus]);

  useEffect(() => {
    registerActiveCloudRealtimeBridge(
      realtimeFileId
        ? {
            fileId: realtimeFileId,
            flushPendingUpdate,
            isRealtimeAvailable: () =>
              cloudRealtimeClient.isLiveForFile(realtimeFileId),
          }
        : null,
    );

    if (!realtimeFileId) {
      clearPendingDebounce();
      cloudRealtimeClient.setActiveFile(null);
      return () => {
        registerActiveCloudRealtimeBridge(null);
      };
    }

    updateFileSyncStatus(
      activeCloudFileRef.current,
      toFileSyncStatus(cloudRealtimeClient.getStatus(), activeCloudFileRef.current),
    );

    cloudRealtimeClient.setActiveFile(realtimeFileId);

    return () => {
      clearPendingDebounce();
      registerActiveCloudRealtimeBridge(null);
      cloudRealtimeClient.setActiveFile(null);
    };
  }, [
    clearPendingDebounce,
    flushPendingUpdate,
    realtimeFileId,
    updateFileSyncStatus,
  ]);

  useEffect(() => {
    const file = realtimeFile;

    if (!file) {
      clearPendingDebounce();
      return;
    }

    if (
      remoteAppliedContentRef.current !== null &&
      file.content === remoteAppliedContentRef.current
    ) {
      remoteAppliedContentRef.current = null;
      clearPendingDebounce();
      return;
    }

    if (file.content === file.lastSyncedContent) {
      clearPendingDebounce();

      if (cloudRealtimeClient.isLiveForFile(file.fileId)) {
        updateFileSyncStatus(file, "live");
      }

      return;
    }

    updateFileSyncStatus(file, "syncing");

    clearPendingDebounce();
    debounceTimerRef.current = window.setTimeout(() => {
      void flushPendingUpdate();
    }, CLOUD_REALTIME_DEBOUNCE_MS);

    return clearPendingDebounce;
  }, [
    realtimeFile,
    realtimeFileId,
    realtimeFileContent,
    realtimeFileLastSyncedContent,
    clearPendingDebounce,
    flushPendingUpdate,
    updateFileSyncStatus,
  ]);
}
