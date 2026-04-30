import { request } from "../../lib/api/apiClient";
import type { CloudFileSummary, CloudFolderSummary } from "../../types/projects";

type FolderResponse = {
  folder: CloudFolderSummary;
};

export type DeleteProjectFolderResponse = {
  folderId: string;
  deletedFileIds: string[];
};

export type MoveProjectFolderResponse = {
  folder: CloudFolderSummary;
  sourceProjectId: string;
  targetProjectId: string;
  movedFiles: CloudFileSummary[];
};

export function createProjectFolder(
  projectId: string,
  payload: {
    name: string;
    parentId?: string | null;
  },
) {
  return request<FolderResponse, typeof payload>({
    url: `/api/projects/${projectId}/folders`,
    method: "POST",
    body: payload,
  });
}

export function updateProjectFolder(projectId: string, folderId: string, payload: { name: string }) {
  return request<FolderResponse, typeof payload>({
    url: `/api/projects/${projectId}/folders/${folderId}`,
    method: "PUT",
    body: payload,
  });
}

export function deleteProjectFolder(projectId: string, folderId: string) {
  return request<DeleteProjectFolderResponse>({
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
  return request<MoveProjectFolderResponse, typeof payload>({
    url: `/api/projects/${projectId}/folders/${folderId}/move`,
    method: "POST",
    body: payload,
  });
}
