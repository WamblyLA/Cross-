import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { cloudRealtimeClient } from "./cloudRealtimeClient";
import { isRealtimeSupportedCloudFileName } from "./cloudRealtimeSupport";
import type {
  CloudFileSyncStatus,
  CloudRealtimeAckPayload,
  CloudRealtimeRemoteUpdatePayload,
  CloudRealtimeTransportStatus,
} from "./cloudRealtimeTypes";

const CLOUD_REALTIME_DEBOUNCE_MS = 250;

type CloudRealtimeConflict = CloudRealtimeRemoteUpdatePayload;

type UseCloudRealtimeFileOptions = {
  enabled: boolean;
  fileId: string;
  fileName: string;
  draft: string;
  serverContent: string;
  version: number;
  hasPendingConflict: boolean;
  canWrite: boolean;
  onJoinedVersion: (version: number) => void;
  onAck: (payload: CloudRealtimeAckPayload) => void;
  onRemoteUpdate: (payload: CloudRealtimeRemoteUpdatePayload) => void;
  onConflict: (payload: CloudRealtimeConflict) => void;
};

function toFileSyncStatus(
  transportStatus: CloudRealtimeTransportStatus,
  draft: string,
  serverContent: string,
): CloudFileSyncStatus {
  if (transportStatus === "live" && draft !== serverContent) {
    return "syncing";
  }

  return transportStatus;
}

export function useCloudRealtimeFile({
  enabled,
  fileId,
  fileName,
  draft,
  serverContent,
  version,
  hasPendingConflict,
  canWrite,
  onJoinedVersion,
  onAck,
  onRemoteUpdate,
  onConflict,
}: UseCloudRealtimeFileOptions) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({
    draft,
    serverContent,
    version,
    hasPendingConflict,
    canWrite,
  });
  const [transportStatus, setTransportStatus] = useState<CloudRealtimeTransportStatus>("offline");
  const isRealtimeSupported = enabled && isRealtimeSupportedCloudFileName(fileName);

  useEffect(() => {
    stateRef.current = {
      draft,
      serverContent,
      version,
      hasPendingConflict,
      canWrite,
    };
  }, [canWrite, draft, hasPendingConflict, serverContent, version]);

  const clearPendingDebounce = useCallback(() => {
    if (!debounceTimerRef.current) {
      return;
    }

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }, []);

  const flushPendingUpdate = useCallback(async () => {
    clearPendingDebounce();

    if (!isRealtimeSupported || !canWrite) {
      return false;
    }

    const current = stateRef.current;

    if (current.hasPendingConflict) {
      return false;
    }

    if (current.draft === current.serverContent) {
      return cloudRealtimeClient.isLiveForFile(fileId);
    }

    if (!cloudRealtimeClient.isLiveForFile(fileId)) {
      return false;
    }

    await cloudRealtimeClient.sendContentUpdate({
      fileId,
      content: current.draft,
      baseVersion: current.version,
    });

    return true;
  }, [canWrite, clearPendingDebounce, fileId, isRealtimeSupported]);

  useEffect(() => {
    return cloudRealtimeClient.subscribe((event) => {
      switch (event.type) {
        case "status":
          setTransportStatus(event.payload.status);
          return;
        case "joined":
          if (event.payload.fileId === fileId) {
            onJoinedVersion(event.payload.version);
          }
          return;
        case "ack":
          if (event.payload.fileId === fileId) {
            onAck(event.payload);
          }
          return;
        case "remote_update":
          if (event.payload.fileId !== fileId) {
            return;
          }

          if (
            stateRef.current.hasPendingConflict ||
            stateRef.current.draft !== stateRef.current.serverContent
          ) {
            onConflict(event.payload);
            return;
          }

          onRemoteUpdate(event.payload);
          return;
        case "ws_error":
          return;
      }
    });
  }, [fileId, onAck, onConflict, onJoinedVersion, onRemoteUpdate]);

  useEffect(() => {
    if (!isRealtimeSupported) {
      clearPendingDebounce();
      cloudRealtimeClient.setActiveFile(null);
      setTransportStatus("offline");
      return;
    }

    cloudRealtimeClient.setActiveFile(fileId);

    return () => {
      clearPendingDebounce();
      cloudRealtimeClient.setActiveFile(null);
    };
  }, [clearPendingDebounce, fileId, isRealtimeSupported]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && isRealtimeSupported) {
        cloudRealtimeClient.refreshConnection();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRealtimeSupported]);

  useEffect(() => {
    if (!isRealtimeSupported || !canWrite || hasPendingConflict) {
      clearPendingDebounce();
      return;
    }

    if (draft === serverContent) {
      clearPendingDebounce();
      return;
    }

    if (!cloudRealtimeClient.isLiveForFile(fileId)) {
      clearPendingDebounce();
      return;
    }

    clearPendingDebounce();
    debounceTimerRef.current = setTimeout(() => {
      void flushPendingUpdate();
    }, CLOUD_REALTIME_DEBOUNCE_MS);

    return clearPendingDebounce;
  }, [
    canWrite,
    clearPendingDebounce,
    draft,
    fileId,
    flushPendingUpdate,
    hasPendingConflict,
    isRealtimeSupported,
    serverContent,
  ]);

  return {
    isRealtimeSupported,
    syncStatus: toFileSyncStatus(transportStatus, draft, serverContent),
    flushPendingUpdate,
  };
}
