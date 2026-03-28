import { request } from "../../lib/api/request";
import type { CloudFile, CloudFileSummary, CloudProject } from "./cloudTypes";

type ProjectsResponse = {
  projects: CloudProject[];
};

type ProjectResponse = {
  project: CloudProject;
};

type FilesResponse = {
  files: CloudFileSummary[];
};

type FileResponse = {
  file: CloudFile;
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
  },
) {
  return request<FileResponse, { name: string; content?: string }>({
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
  },
) {
  return request<FileResponse, { name?: string; content?: string }>({
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
