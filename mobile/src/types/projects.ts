export type ProjectAccessRole = "owner" | "editor" | "viewer";

export type CloudProject = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  accessRole: ProjectAccessRole;
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

export type ProjectMember = {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: ProjectAccessRole;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectTreeItem =
  | {
      key: string;
      type: "folder";
      level: number;
      isExpanded: boolean;
      folder: CloudFolderSummary;
    }
  | {
      key: string;
      type: "file";
      level: number;
      file: CloudFileSummary;
    };
