export type WorkspaceSource = "local" | "cloud";
export type CloudProjectAccessRole = "owner" | "editor" | "viewer";
export type ProjectMemberRole = CloudProjectAccessRole;

export type CloudProject = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  accessRole: CloudProjectAccessRole;
  isOwner: boolean;
};

export type CloudFolderSummary = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudFileSummary = {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CloudFolderTreeNode = CloudFolderSummary & {
  folders: CloudFolderTreeNode[];
  files: CloudFileSummary[];
};

export type CloudProjectTree = {
  projectId: string;
  folders: CloudFolderTreeNode[];
  files: CloudFileSummary[];
};

export type CloudFile = CloudFileSummary & {
  content: string;
  version: number;
  canWrite?: boolean;
};

export type ProjectMember = {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: ProjectMemberRole;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PendingProjectInvitation = {
  id: string;
  inviteeUserId: string;
  username: string;
  email: string;
  role: Extract<ProjectMemberRole, "editor" | "viewer">;
  status: "pending";
  createdAt: string;
  updatedAt: string;
};

export type CloudRunSnapshotFolder = CloudFolderSummary & {
  relativePath: string;
};

export type CloudRunSnapshotFile = CloudFile & {
  relativePath: string;
};

export type CloudProjectRunSnapshot = {
  projectId: string;
  projectName: string;
  folders: CloudRunSnapshotFolder[];
  files: CloudRunSnapshotFile[];
};

export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export type CloudSelectionType = "project" | "folder" | "file" | null;

export type CloudProjectsState = {
  projects: CloudProject[];
  projectsStatus: AsyncStatus;
  projectsError: import("../../lib/api/errorNormalization").ApiError | null;
  activeProjectId: string | null;
  selectedItemKeys: string[];
  focusedItemKey: string | null;
  selectionAnchorKey: string | null;
  selectedProjectId: string | null;
  selectedFolderId: string | null;
  selectedFileId: string | null;
  selectedItemType: CloudSelectionType;
  selectedItemCount: number;
  filesByProjectId: Record<string, CloudFileSummary[]>;
  treeByProjectId: Record<string, CloudProjectTree | undefined>;
  filesStatusByProjectId: Record<string, AsyncStatus | undefined>;
  filesErrorByProjectId: Record<
    string,
    import("../../lib/api/errorNormalization").ApiError | null | undefined
  >;
  projectActionPending: "create" | "rename" | "delete" | null;
  projectActionTargetId: string | null;
  projectActionError: import("../../lib/api/errorNormalization").ApiError | null;
  folderActionPending: "create" | "rename" | "delete" | "move" | null;
  folderActionTargetId: string | null;
  folderActionError: import("../../lib/api/errorNormalization").ApiError | null;
  fileActionPending: "create" | "rename" | "delete" | "save" | "open" | "move" | null;
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

export function flattenCloudTreeFiles(tree: CloudProjectTree): CloudFileSummary[] {
  const files: CloudFileSummary[] = [...tree.files];

  const visitFolder = (folder: CloudFolderTreeNode) => {
    files.push(...folder.files);
    folder.folders.forEach(visitFolder);
  };

  tree.folders.forEach(visitFolder);

  return files;
}
