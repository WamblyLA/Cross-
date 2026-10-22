import { useCallback } from "react";
import { getReadOnlyCloudMessage } from "../features/cloud/projectCollaborationMessages";
import {
  flushActiveCloudRealtimeUpdate,
  isCloudRealtimeHandlingFile,
} from "../features/cloud/realtime/cloudRealtimeClient";
import { saveCloudProjectFile } from "../features/cloud/cloudThunks";
import { persistOpenedFile } from "../features/files/openedFilePersistence";
import type { OpenedFile } from "../features/files/fileTypes";
import { applyCloudFileSavedSnapshot, markFileSaved } from "../features/files/filesSlice";
import { createApiError } from "../lib/api/errorNormalization";
import { useAppDispatch } from "../store/hooks";

type UseOpenedFilePersistenceOptions = {
  enforceCloudWriteAccess?: boolean;
};

export function useOpenedFilePersistence({
  enforceCloudWriteAccess = false,
}: UseOpenedFilePersistenceOptions = {}) {
  const dispatch = useAppDispatch();

  return useCallback(
    async (file: OpenedFile) => {
      if (enforceCloudWriteAccess && file.kind === "cloud" && !file.canWrite) {
        throw createApiError(getReadOnlyCloudMessage(), {
          code: "FORBIDDEN",
          status: 403,
        });
      }

      await persistOpenedFile(file, {
        writeLocalFile: (path, content) => window.electronAPI.writeFile(path, content),
        markLocalFileSaved: (tabId) => {
          dispatch(markFileSaved(tabId));
        },
        isCloudRealtimeActive: isCloudRealtimeHandlingFile,
        flushCloudRealtimeUpdate: flushActiveCloudRealtimeUpdate,
        saveCloudFile: async (input) => {
          const response = await dispatch(saveCloudProjectFile(input)).unwrap();
          return response.file;
        },
        applyCloudSavedSnapshot: (snapshot) => {
          dispatch(applyCloudFileSavedSnapshot(snapshot));
        },
      });
    },
    [dispatch, enforceCloudWriteAccess],
  );
}
