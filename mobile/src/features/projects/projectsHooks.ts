import { useQuery } from "@tanstack/react-query";
import * as projectsApi from "./projectsApi";
import type { ApiError } from "../../types/api";

export const projectsQueryKeys = {
  all: ["projects"] as const,
  detail: (projectId: string) => ["projects", projectId] as const,
  tree: (projectId: string) => ["projects", projectId, "tree"] as const,
  members: (projectId: string) => ["projects", projectId, "members"] as const,
};

export function useProjectsQuery() {
  return useQuery<Awaited<ReturnType<typeof projectsApi.listProjects>>["projects"], ApiError>({
    queryKey: projectsQueryKeys.all,
    queryFn: async () => {
      const response = await projectsApi.listProjects();
      return response.projects;
    },
  });
}

export function useProjectQuery(projectId: string) {
  return useQuery<Awaited<ReturnType<typeof projectsApi.getProject>>["project"], ApiError>({
    queryKey: projectsQueryKeys.detail(projectId),
    queryFn: async () => {
      const response = await projectsApi.getProject(projectId);
      return response.project;
    },
  });
}

export function useProjectTreeQuery(projectId: string) {
  return useQuery<Awaited<ReturnType<typeof projectsApi.getProjectTree>>["tree"], ApiError>({
    queryKey: projectsQueryKeys.tree(projectId),
    queryFn: async () => {
      const response = await projectsApi.getProjectTree(projectId);
      return response.tree;
    },
  });
}

export function useProjectMembersQuery(projectId: string) {
  return useQuery<Awaited<ReturnType<typeof projectsApi.getProjectMembers>>["members"], ApiError>({
    queryKey: projectsQueryKeys.members(projectId),
    queryFn: async () => {
      const response = await projectsApi.getProjectMembers(projectId);
      return response.members;
    },
  });
}
