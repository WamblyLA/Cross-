import { request } from "../../lib/api/apiClient";
import type { CloudFile } from "../../types/files";

type FileResponse = {
  file: CloudFile;
};

type MovedCloudFile = Omit<CloudFile, "canWrite"> & {
  canWrite?: boolean;
};

export type MoveProjectFileResponse = {
  file: MovedCloudFile;
  sourceProjectId: string;
  targetProjectId: string;
};

export function createProjectFile(
  projectId: string,
  payload: {
    name: string;
    content?: string;
    folderId?: string | null;
  },
) {
  return request<FileResponse, typeof payload>({
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
  return request<FileResponse, typeof payload>({
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
  return request<MoveProjectFileResponse, typeof payload>({
    url: `/api/projects/${projectId}/files/${fileId}/move`,
    method: "POST",
    body: payload,
  });
}
