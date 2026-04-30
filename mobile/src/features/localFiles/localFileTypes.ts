import type { FileKind } from "../../types/files";

export type LocalFileSourceKind = "picker" | "external-intent" | "save-as";
export type LocalFileSaveStrategy = "direct-source" | "save-as-required";

export type LocalFileReadSource = {
  fileName: string | null;
  workingUri: string;
  originalUri: string | null;
  mimeType: string | null;
  size: number | null;
  sourceKind: LocalFileSourceKind;
  canDirectWrite: boolean;
  hasPersistedReadPermission: boolean;
  hasPersistedWritePermission: boolean;
};

export type IncomingLocalFileIntent = {
  action: "view" | "send";
  uri: string;
  workingUri: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  canPersistReadPermission: boolean;
  canPersistWritePermission: boolean;
  hasWritePermission: boolean;
  hasPersistedReadPermission: boolean;
  hasPersistedWritePermission: boolean;
};

export type LoadedLocalFile = {
  fileName: string;
  originalUri: string | null;
  workingUri: string;
  mimeType: string | null;
  size: number | null;
  content: string;
  kind: FileKind;
  source: "local";
  sourceKind: LocalFileSourceKind;
  saveStrategy: LocalFileSaveStrategy;
  editable: boolean;
  canDirectWrite: boolean;
  hasPersistedReadPermission: boolean;
  hasPersistedWritePermission: boolean;
};

export type LocalOpenedFile = LoadedLocalFile & {
  id: string;
};
