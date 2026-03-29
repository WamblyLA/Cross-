export type WorkspaceSource = "local" | "cloud";

export type CloudProject = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
};

export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export type CloudSelectionType = "project" | "folder" | "file" | null;

export type CloudProjectsState = {
  projects: CloudProject[];
  projectsStatus: AsyncStatus;
  projectsError: import("../../lib/api/errorNormalization").ApiError | null;
  activeProjectId: string | null;
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
