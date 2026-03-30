import { getBaseName, getExtension } from "../../utils/path";
import { buildCloudEditorPath, buildCloudTabId } from "../cloud/cloudTypes";
import type { CloudFileSyncStatus } from "../cloud/realtime/cloudRealtimeTypes";

type BaseOpenedFile = {
  tabId: string;
  editorPath: string;
  name: string;
  extension: string | null;
  content: string;
  isDirty: boolean;
};

export type LocalOpenedFile = BaseOpenedFile & {
  kind: "local";
  path: string;
};

export type CloudOpenedFile = BaseOpenedFile & {
  kind: "cloud";
  projectId: string;
  fileId: string;
  version: number;
  updatedAt: string | null;
  syncStatus: CloudFileSyncStatus;
  lastSyncedContent: string;
};

export type OpenedFile = LocalOpenedFile | CloudOpenedFile;

export function buildLocalTabId(path: string) {
  return `local:${path}`;
}

export function buildLocalOpenedFile(path: string, content: string): LocalOpenedFile {
  return {
    kind: "local",
    tabId: buildLocalTabId(path),
    editorPath: path,
    path,
    name: getBaseName(path),
    extension: getExtension(path),
    content,
    isDirty: false,
  };
}

export function buildCloudOpenedFile(payload: {
  projectId: string;
  fileId: string;
  name: string;
  content: string;
  version: number;
  updatedAt?: string | null;
}): CloudOpenedFile {
  return {
    kind: "cloud",
    tabId: buildCloudTabId(payload.projectId, payload.fileId),
    editorPath: buildCloudEditorPath(payload.projectId, payload.fileId, payload.name),
    projectId: payload.projectId,
    fileId: payload.fileId,
    name: payload.name,
    extension: getExtension(payload.name),
    content: payload.content,
    isDirty: false,
    version: payload.version,
    updatedAt: payload.updatedAt ?? null,
    syncStatus: "offline",
    lastSyncedContent: payload.content,
  };
}
