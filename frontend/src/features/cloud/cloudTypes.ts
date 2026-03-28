export type WorkspaceSource = "local" | "cloud";

export type CloudProject = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudFileSummary = {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudFile = CloudFileSummary & {
  content: string;
};

export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export type CloudSelectionType = "project" | "file" | null;

export type CloudProjectsState = {
  projects: CloudProject[];
  projectsStatus: AsyncStatus;
  projectsError: import("../../lib/api/errorNormalization").ApiError | null;
  activeProjectId: string | null;
  selectedProjectId: string | null;
  selectedFileId: string | null;
  selectedItemType: CloudSelectionType;
  filesByProjectId: Record<string, CloudFileSummary[]>;
  filesStatusByProjectId: Record<string, AsyncStatus | undefined>;
  filesErrorByProjectId: Record<
    string,
    import("../../lib/api/errorNormalization").ApiError | null | undefined
  >;
  projectActionPending: "create" | "rename" | "delete" | null;
  projectActionTargetId: string | null;
  projectActionError: import("../../lib/api/errorNormalization").ApiError | null;
  fileActionPending: "create" | "rename" | "delete" | "save" | "open" | null;
  fileActionTargetId: string | null;
  fileActionError: import("../../lib/api/errorNormalization").ApiError | null;
};

export function buildCloudTabId(projectId: string, fileId: string) {
  return `cloud:${projectId}:${fileId}`;
}

export function buildCloudEditorPath(projectId: string, fileId: string, name: string) {
  const encodedName = encodeURIComponent(name);
  return `cloud://${projectId}/${fileId}/${encodedName}`;
}
