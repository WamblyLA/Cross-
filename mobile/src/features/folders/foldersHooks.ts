import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "../../types/api";
import { fileQueryKeys } from "../files/filesHooks";
import { projectsQueryKeys } from "../projects/projectsHooks";
import * as foldersApi from "./foldersApi";

export function useCreateProjectFolderMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof foldersApi.createProjectFolder>>,
    ApiError,
    {
      name: string;
      parentId?: string | null;
    }
  >({
    mutationFn: (payload) => foldersApi.createProjectFolder(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(projectId) });
    },
  });
}

export function useUpdateProjectFolderMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof foldersApi.updateProjectFolder>>,
    ApiError,
    {
      folderId: string;
      name: string;
    }
  >({
    mutationFn: ({ folderId, ...payload }) => foldersApi.updateProjectFolder(projectId, folderId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(projectId) });
    },
  });
}

export function useDeleteProjectFolderMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof foldersApi.deleteProjectFolder>>,
    ApiError,
    { folderId: string }
  >({
    mutationFn: ({ folderId }) => foldersApi.deleteProjectFolder(projectId, folderId),
    onSuccess: (response) => {
      response.deletedFileIds.forEach((fileId) => {
        queryClient.removeQueries({ queryKey: fileQueryKeys.detail(projectId, fileId) });
      });
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(projectId) });
    },
  });
}

export function useMoveProjectFolderMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof foldersApi.moveProjectFolder>>,
    ApiError,
    {
      folderId: string;
      targetProjectId: string;
      targetParentId: string | null;
    }
  >({
    mutationFn: ({ folderId, targetProjectId, targetParentId }) =>
      foldersApi.moveProjectFolder(projectId, folderId, { targetProjectId, targetParentId }),
    onSuccess: (response) => {
      response.movedFiles.forEach((file) => {
        queryClient.removeQueries({ queryKey: fileQueryKeys.detail(response.sourceProjectId, file.id) });
      });
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(response.sourceProjectId) });
      void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.tree(response.targetProjectId) });
    },
  });
}
