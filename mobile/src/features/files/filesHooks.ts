import { useQuery } from "@tanstack/react-query";
import * as filesApi from "./filesApi";
import type { ApiError } from "../../types/api";

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
