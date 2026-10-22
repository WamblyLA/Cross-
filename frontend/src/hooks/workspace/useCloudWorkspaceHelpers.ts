import { useCallback } from "react";
import { getReadOnlyCloudMessage } from "../../features/cloud/projectCollaborationMessages";
import type { CloudSelectionEntry } from "../../features/cloud/cloudSelection";
import {
  selectCloudActiveProjectId,
  selectCloudProjects,
} from "../../features/cloud/cloudSelectors";
import {
  selectCloudItem,
  setActiveProjectId,
  setCloudSelection,
} from "../../features/cloud/cloudSlice";
import { fetchProjectTree } from "../../features/cloud/cloudThunks";
import { retargetCloudFiles } from "../../features/files/filesSlice";
import { setWorkspaceSource } from "../../features/workspace/workspaceSlice";
import { createApiError } from "../../lib/api/errorNormalization";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

type CloudWorkspaceTarget = {
  projectId: string;
  folderId?: string | null;
  fileId?: string | null;
  itemType: "project" | "folder" | "file";
};

export type RetargetedCloudFile = {
  sourceProjectId: string;
  targetProjectId: string;
  fileId: string;
  name: string;
};

export function useCloudWorkspaceHelpers() {
  const dispatch = useAppDispatch();
  const projects = useAppSelector(selectCloudProjects);
  const activeProjectId = useAppSelector(selectCloudActiveProjectId);

  const getCloudProject = useCallback(
    (projectId: string) => projects.find((project) => project.id === projectId) ?? null,
    [projects],
  );

  const assertCanWriteCloudProject = useCallback(
    (projectId: string) => {
      const project = getCloudProject(projectId);

      if (!project) {
        throw createApiError("Проект не найден.", {
          code: "PROJECT_NOT_FOUND",
          status: 404,
        });
      }

      if (project.accessRole === "viewer") {
        throw createApiError(getReadOnlyCloudMessage(), {
          code: "FORBIDDEN",
          status: 403,
        });
      }

      return project;
    },
    [getCloudProject],
  );

  const assertCanManageOwnedCloudProject = useCallback(
    (projectId: string) => {
      const project = getCloudProject(projectId);

      if (!project) {
        throw createApiError("Проект не найден.", {
          code: "PROJECT_NOT_FOUND",
          status: 404,
        });
      }

      if (!project.isOwner) {
        throw createApiError("У вас нет прав на управление этим проектом.", {
          code: "FORBIDDEN",
          status: 403,
        });
      }

      return project;
    },
    [getCloudProject],
  );

  const refreshProjectTrees = useCallback(
    async (...projectIds: Array<string | null | undefined>) => {
      const uniqueProjectIds = Array.from(
        new Set(projectIds.filter((projectId): projectId is string => Boolean(projectId))),
      );

      await Promise.all(
        uniqueProjectIds.map((projectId) =>
          dispatch(fetchProjectTree({ projectId })).unwrap(),
        ),
      );
    },
    [dispatch],
  );

  const focusCloudItem = useCallback(
    ({ projectId, folderId = null, fileId = null, itemType }: CloudWorkspaceTarget) => {
      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(selectCloudItem({ projectId, folderId, fileId, itemType }));
    },
    [dispatch],
  );

  const focusCloudSelection = useCallback(
    (projectId: string, items: CloudSelectionEntry[]) => {
      dispatch(setWorkspaceSource("cloud"));
      dispatch(setActiveProjectId(projectId));
      dispatch(
        setCloudSelection({
          items,
          focusedItemKey: items[0]?.key ?? null,
          selectionAnchorKey: items[0]?.key ?? null,
        }),
      );
    },
    [dispatch],
  );

  const retargetMovedCloudFiles = useCallback(
    (items: RetargetedCloudFile[]) => {
      if (items.length > 0) {
        dispatch(retargetCloudFiles({ items }));
      }
    },
    [dispatch],
  );

  return {
    activeProjectId,
    activeCloudProject: projects.find((project) => project.id === activeProjectId) ?? null,
    getCloudProject,
    assertCanWriteCloudProject,
    assertCanManageOwnedCloudProject,
    refreshProjectTrees,
    focusCloudItem,
    focusCloudSelection,
    retargetMovedCloudFiles,
  };
}
