import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "../../types/api";
import { projectsQueryKeys } from "../projects/projectsHooks";
import * as filesApi from "./filesApi";

export const fileQueryKeys = {
  detail: (projectId: string, fileId: string) => ["files", projectId, fileId] as const,
};

export function useProjectFileQuery(projectId: string, fileId: string) {
  return useQuery<Awaited<ReturnType<typeof filesApi.getProjectFile>>["file"], ApiError>({
    queryKey: fileQueryKeys.detail(projectId, fileId),
    queryFn: async () => {
      const response = await filesApi.getProjectFile(projectId, fileId);
      return response.file;
    },
  });
}

export function useCreateProjectFileMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof filesApi.createProjectFile>>,
    ApiError,
    {
      name: string;
      content?: string;
      folderId?: string | null;
    }
  >({
    mutationFn: (payload) => filesApi.createProjectFile(projectId, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(fileQueryKeys.detail(projectId, response.file.id), response.file);
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(projectId) });
    },
  });
}

export function useUpdateProjectFileMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof filesApi.updateProjectFile>>,
    ApiError,
    {
      fileId: string;
      name?: string;
      content?: string;
      expectedVersion?: number;
    }
  >({
    mutationFn: ({ fileId, ...payload }) => filesApi.updateProjectFile(projectId, fileId, payload),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(fileQueryKeys.detail(projectId, variables.fileId), response.file);
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(projectId) });
    },
  });
}

export function useDeleteProjectFileMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { fileId: string }>({
    mutationFn: ({ fileId }) => filesApi.deleteProjectFile(projectId, fileId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: fileQueryKeys.detail(projectId, variables.fileId) });
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(projectId) });
    },
  });
}

export function useMoveProjectFileMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof filesApi.moveProjectFile>>,
    ApiError,
    {
      fileId: string;
      targetProjectId: string;
      targetFolderId: string | null;
    }
  >({
    mutationFn: ({ fileId, targetProjectId, targetFolderId }) =>
      filesApi.moveProjectFile(projectId, fileId, { targetProjectId, targetFolderId }),
    onSuccess: (response) => {
      queryClient.setQueryData(
        fileQueryKeys.detail(response.targetProjectId, response.file.id),
        {
          ...response.file,
          canWrite: response.file.canWrite ?? true,
        },
      );
      queryClient.removeQueries({
        queryKey: fileQueryKeys.detail(response.sourceProjectId, response.file.id),
      });
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(response.sourceProjectId) });
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(response.targetProjectId) });
    },
  });
}
