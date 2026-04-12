import { request } from "../../lib/api/apiClient";
import type {
  CloudProject,
  CloudProjectTree,
  ProjectMember,
} from "../../types/projects";

type ProjectsResponse = {
  projects: CloudProject[];
};

type ProjectResponse = {
  project: CloudProject;
};

type ProjectTreeResponse = {
  tree: CloudProjectTree;
};

type MembersResponse = {
  members: ProjectMember[];
};

export function listProjects() {
  return request<ProjectsResponse>({
    url: "/api/projects",
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

export function getProjectMembers(projectId: string) {
  return request<MembersResponse>({
    url: `/api/projects/${projectId}/members`,
  });
}
