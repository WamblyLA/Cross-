export type WorkspaceMode = "local" | "cloud" | "linked";
export type SyncDirection = "push" | "pull";
export type SyncScope = "file" | "workspace";
export type LinkedBindingStatus =
  | "unlinked"
  | "linked_ready"
  | "scan_required"
  | "preview_ready"
  | "sync_in_progress"
  | "sync_error";
export type SyncItemKind = "file" | "folder";
export type SyncItemAction = "create" | "update" | "delete";
export type SyncPreviewItemState =
  | "in_sync"
  | "local_only"
  | "cloud_only"
  | "different"
  | "blocked_dirty_buffer"
  | "pending_delete_confirm"
  | "apply_error";
export type SyncOperationStatus = "idle" | "loading" | "succeeded" | "failed";

export type LinkedWorkspaceBinding = {
  id: string;
  projectId: string;
  projectName: string;
  clientBindingKey: string;
  localRootPath: string | null;
  localRootLabel: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
  lastSyncDirection: SyncDirection | null;
  status: LinkedBindingStatus;
};

export type SyncPlanItem = {
  relativePath: string;
  kind: SyncItemKind;
  state: SyncPreviewItemState;
  action: SyncItemAction | null;
  reason: string;
  requiresDeleteConfirm: boolean;
  blockedByDirtyTab: boolean;
  depth: number;
  localExists: boolean;
  cloudExists: boolean;
  localPath: string | null;
  cloudFileId: string | null;
  cloudFolderId: string | null;
  localHash: string | null;
  cloudHash: string | null;
  cloudVersion: number | null;
};

export type SyncPreviewSummary = {
  createCount: number;
  updateCount: number;
  deleteCount: number;
  blockedCount: number;
};

export type SyncPreview = {
  id: string;
  bindingId: string;
  direction: SyncDirection;
  scope: SyncScope;
  targetRelativePath: string | null;
  createdAt: string;
  items: SyncPlanItem[];
  summary: SyncPreviewSummary;
};

export type SyncOperation = {
  bindingId: string;
  direction: SyncDirection;
  scope: SyncScope;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
};

export type SyncState = {
  bindings: LinkedWorkspaceBinding[];
  bindingsStatus: SyncOperationStatus;
  bindingsError: string | null;
  preview: SyncPreview | null;
  previewDialogOpen: boolean;
  previewStatus: SyncOperationStatus;
  previewError: string | null;
  operation: SyncOperation | null;
  operationStatus: SyncOperationStatus;
  operationError: string | null;
};

export type CloudSnapshotFolder = {
  id: string;
  parentId: string | null;
  name: string;
  relativePath: string;
};

export type CloudSnapshotFile = {
  id: string;
  folderId: string | null;
  name: string;
  relativePath: string;
  contentHash: string;
  contentSize: number;
  version: number;
  updatedAt: string;
};

export type CloudSyncSnapshot = {
  projectId: string;
  projectName: string;
  folders: CloudSnapshotFolder[];
  files: CloudSnapshotFile[];
};

export type LocalSnapshotFolder = {
  relativePath: string;
  path: string;
};

export type LocalSnapshotFile = {
  relativePath: string;
  path: string;
  hash: string;
  size: number | null;
  mtimeMs: number | null;
};

export type LocalSyncSnapshot = {
  rootPath: string;
  folders: LocalSnapshotFolder[];
  files: LocalSnapshotFile[];
};
