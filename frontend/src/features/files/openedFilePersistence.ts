import type { OpenedFile } from "./fileTypes";

type CloudSavedSnapshot = {
  id: string;
  content: string;
  version: number;
  updatedAt: string;
};

export type OpenedFilePersistenceDependencies = {
  writeLocalFile: (path: string, content: string) => Promise<unknown>;
  markLocalFileSaved: (tabId: string) => void;
  isCloudRealtimeActive: (fileId: string) => boolean;
  flushCloudRealtimeUpdate: (fileId: string) => Promise<boolean>;
  saveCloudFile: (input: {
    projectId: string;
    fileId: string;
    content: string;
  }) => Promise<CloudSavedSnapshot>;
  applyCloudSavedSnapshot: (snapshot: {
    fileId: string;
    content: string;
    version: number;
    updatedAt: string;
  }) => void;
};

export async function persistOpenedFile(
  file: OpenedFile,
  dependencies: OpenedFilePersistenceDependencies,
) {
  if (file.kind === "local") {
    await dependencies.writeLocalFile(file.path, file.content);
    dependencies.markLocalFileSaved(file.tabId);
    return;
  }

  const savedViaRealtime = dependencies.isCloudRealtimeActive(file.fileId)
    ? await dependencies.flushCloudRealtimeUpdate(file.fileId)
    : false;

  if (savedViaRealtime) {
    return;
  }

  const savedFile = await dependencies.saveCloudFile({
    projectId: file.projectId,
    fileId: file.fileId,
    content: file.content,
  });

  dependencies.applyCloudSavedSnapshot({
    fileId: savedFile.id,
    content: savedFile.content,
    version: savedFile.version,
    updatedAt: savedFile.updatedAt,
  });
}
