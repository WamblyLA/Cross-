import { request } from "../../lib/api/apiClient";
import type { CloudFile } from "../../types/files";

type FileResponse = {
  file: CloudFile;
};

export function getProjectFile(projectId: string, fileId: string) {
  return request<FileResponse>({
    url: `/api/projects/${projectId}/files/${fileId}`,
  });
}

export function updateProjectFile(
  projectId: string,
  fileId: string,
  payload: {
    content: string;
    expectedVersion: number;
  },
) {
  return request<FileResponse, typeof payload>({
    url: `/api/projects/${projectId}/files/${fileId}`,
    method: "PUT",
    body: payload,
  });
}
