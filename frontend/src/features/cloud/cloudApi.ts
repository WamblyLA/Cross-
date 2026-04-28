import { request } from "../../lib/api/request";
import type {
  CloudFile,
  CloudProjectRunSnapshot,
  CloudFileSummary,
  CloudFolderSummary,
  PendingProjectInvitation,
  ProjectMember,
  CloudProject,
  CloudProjectTree,
  ProjectMemberRole,
} from "./cloudTypes";
import type { ServerNotificationItem } from "../notifications/notificationsTypes";

type ProjectsResponse = {
  projects: CloudProject[];
};

type ProjectResponse = {
  project: CloudProject;
};

type ProjectTreeResponse = {
  tree: CloudProjectTree;
};

type ProjectRunSnapshotResponse = {
  snapshot: CloudProjectRunSnapshot;
};

type ProjectSyncManifestResponse = {
  manifest: {
    projectId: string;
    projectName: string;
    folders: Array<{
      id: string;
      parentId: string | null;
      name: string;
      relativePath: string;
    }>;
    files: Array<{
      id: string;
      folderId: string | null;
      name: string;
      relativePath: string;
      version: number;
      updatedAt: string;
      contentHash: string;
      contentSize: number;
    }>;
  };
};

type FilesResponse = {
  files: CloudFileSummary[];
};

type FileResponse = {
  file: CloudFile;
};

type ProjectMembersResponse = {
  members: ProjectMember[];
  pendingInvitations: PendingProjectInvitation[];
};

type ProjectMemberResponse = {
  member: ProjectMember;
};

type ProjectInvitationResponse = {
  invitation: PendingProjectInvitation;
};

type NotificationsResponse = {
  notifications: ServerNotificationItem[];
};

type InvitationActionResponse = {
  invitationId: string;
  projectId: string;
};

type FolderResponse = {
  folder: CloudFolderSummary;
};

type DeleteFolderResponse = {
  folderId: string;
  deletedFileIds: string[];
};

type MoveFileResponse = {
  file: CloudFile;
  sourceProjectId: string;
  targetProjectId: string;
};

type MoveFolderResponse = {
  folder: CloudFolderSummary;
  sourceProjectId: string;
  targetProjectId: string;
  movedFiles: CloudFileSummary[];
};

export function listProjects() {
  return request<ProjectsResponse>({
    url: "/api/projects",
  });
}

export function createProject(payload: { name: string }) {
  return request<ProjectResponse, { name: string }>({
    url: "/api/projects",
    method: "POST",
    body: payload,
  });
}

export function getProject(projectId: string) {
  return request<ProjectResponse>({
    url: `/api/projects/${projectId}`,
  });
}

export function getProjectTree(projectId: string) {
  return request<ProjectTreeResponse>({
    url: `/api/projects/${projectId}/tree`,
  });
}

export function getProjectRunSnapshot(projectId: string) {
  return request<ProjectRunSnapshotResponse>({
    url: `/api/projects/${projectId}/run-snapshot`,
  });
}

export function getProjectSyncManifest(
  projectId: string,
  options?: {
    targetRelativePath?: string | null;
  },
) {
  const query = options?.targetRelativePath
    ? `?targetRelativePath=${encodeURIComponent(options.targetRelativePath)}`
    : "";

  return request<ProjectSyncManifestResponse>({
    url: `/api/projects/${projectId}/sync-manifest${query}`,
  });
}

export function renameProject(projectId: string, payload: { name: string }) {
  return request<ProjectResponse, { name: string }>({
    url: `/api/projects/${projectId}`,
    method: "PUT",
    body: payload,
  });
}

export function deleteProject(projectId: string) {
  return request<void>({
    url: `/api/projects/${projectId}`,
    method: "DELETE",
  });
}

export function listProjectMembers(projectId: string) {
  return request<ProjectMembersResponse>({
    url: `/api/projects/${projectId}/members`,
  });
}

export function createProjectInvitation(
  projectId: string,
  payload: { email: string; role: Extract<ProjectMemberRole, "editor" | "viewer"> },
) {
  return request<ProjectInvitationResponse, { email: string; role: Extract<ProjectMemberRole, "editor" | "viewer"> }>({
    url: `/api/projects/${projectId}/invitations`,
    method: "POST",
    body: payload,
  });
}

export function revokeProjectInvitation(projectId: string, invitationId: string) {
  return request<void>({
    url: `/api/projects/${projectId}/invitations/${invitationId}`,
    method: "DELETE",
  });
}

export function listNotifications() {
  return request<NotificationsResponse>({
    url: "/api/notifications",
  });
}

export function acceptProjectInvitation(invitationId: string) {
  return request<InvitationActionResponse>({
    url: `/api/project-invitations/${invitationId}/accept`,
    method: "POST",
  });
}

export function declineProjectInvitation(invitationId: string) {
  return request<InvitationActionResponse>({
    url: `/api/project-invitations/${invitationId}/decline`,
    method: "POST",
  });
}

export function updateProjectMemberRole(
  projectId: string,
  memberId: string,
  payload: { role: Extract<ProjectMemberRole, "editor" | "viewer"> },
) {
  return request<ProjectMemberResponse, { role: Extract<ProjectMemberRole, "editor" | "viewer"> }>({
    url: `/api/projects/${projectId}/members/${memberId}`,
    method: "PATCH",
    body: payload,
  });
}

export function deleteProjectMember(projectId: string, memberId: string) {
  return request<void>({
    url: `/api/projects/${projectId}/members/${memberId}`,
    method: "DELETE",
  });
}

export function listProjectFiles(projectId: string) {
  return request<FilesResponse>({
    url: `/api/projects/${projectId}/files`,
  });
}

export function createProjectFile(
  projectId: string,
  payload: {
    name: string;
    content?: string;
    folderId?: string | null;
  },
) {
  return request<FileResponse, { name: string; content?: string; folderId?: string | null }>({
    url: `/api/projects/${projectId}/files`,
    method: "POST",
    body: payload,
  });
}

export function getProjectFile(projectId: string, fileId: string) {
  return request<FileResponse>({
    url: `/api/projects/${projectId}/files/${fileId}`,
  });
}

export function updateProjectFile(
  projectId: string,
  fileId: string,
  payload: {
    name?: string;
    content?: string;
    expectedVersion?: number;
  },
) {
  return request<FileResponse, { name?: string; content?: string; expectedVersion?: number }>({
    url: `/api/projects/${projectId}/files/${fileId}`,
    method: "PUT",
    body: payload,
  });
}

export function deleteProjectFile(projectId: string, fileId: string) {
  return request<void>({
    url: `/api/projects/${projectId}/files/${fileId}`,
    method: "DELETE",
  });
}

export function moveProjectFile(
  projectId: string,
  fileId: string,
  payload: {
    targetProjectId: string;
    targetFolderId: string | null;
  },
) {
  return request<MoveFileResponse, { targetProjectId: string; targetFolderId: string | null }>({
    url: `/api/projects/${projectId}/files/${fileId}/move`,
    method: "POST",
    body: payload,
  });
}

export function createProjectFolder(
  projectId: string,
  payload: {
    name: string;
    parentId?: string | null;
  },
) {
  return request<FolderResponse, { name: string; parentId?: string | null }>({
    url: `/api/projects/${projectId}/folders`,
    method: "POST",
    body: payload,
  });
}

export function updateProjectFolder(projectId: string, folderId: string, payload: { name: string }) {
  return request<FolderResponse, { name: string }>({
    url: `/api/projects/${projectId}/folders/${folderId}`,
    method: "PUT",
    body: payload,
  });
}

export function deleteProjectFolder(projectId: string, folderId: string) {
  return request<DeleteFolderResponse>({
    url: `/api/projects/${projectId}/folders/${folderId}`,
    method: "DELETE",
  });
}

export function moveProjectFolder(
  projectId: string,
  folderId: string,
  payload: {
    targetProjectId: string;
    targetParentId: string | null;
  },
) {
  return request<MoveFolderResponse, { targetProjectId: string; targetParentId: string | null }>({
    url: `/api/projects/${projectId}/folders/${folderId}/move`,
    method: "POST",
    body: payload,
  });
}
