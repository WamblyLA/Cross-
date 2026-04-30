import { request } from "../../lib/api/request";
import type { LinkedWorkspaceBinding, SyncDirection } from "./syncTypes";

type ProjectLinksResponse = {
  links: Array<
    Omit<LinkedWorkspaceBinding, "localRootPath" | "status"> & {
      localRootPath?: string | null;
      status?: LinkedWorkspaceBinding["status"];
    }
  >;
};

type ProjectLinkResponse = {
  link: Omit<LinkedWorkspaceBinding, "localRootPath" | "status"> & {
    localRootPath?: string | null;
    status?: LinkedWorkspaceBinding["status"];
  };
};

export function listProjectLinks() {
  return request<ProjectLinksResponse>({
    url: "/api/project-links",
  });
}

export function createProjectLink(payload: {
  projectId: string;
  clientBindingKey: string;
  localRootLabel: string;
}) {
  return request<ProjectLinkResponse, typeof payload>({
    url: "/api/project-links",
    method: "POST",
    body: payload,
  });
}

export function deleteProjectLink(linkId: string) {
  return request<void>({
    url: `/api/project-links/${linkId}`,
    method: "DELETE",
  });
}

export function updateProjectLinkSyncSummary(
  linkId: string,
  payload: {
    lastSyncAt: string;
    lastSyncDirection: SyncDirection;
  },
) {
  return request<ProjectLinkResponse, typeof payload>({
    url: `/api/project-links/${linkId}/sync-summary`,
    method: "PUT",
    body: payload,
  });
}
