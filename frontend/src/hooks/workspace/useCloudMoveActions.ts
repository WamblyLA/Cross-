import { useCallback } from "react";
import {
  createCloudSelectionEntry,
  type CloudSelectionEntry,
} from "../../features/cloud/cloudSelection";
import { setCloudSelection } from "../../features/cloud/cloudSlice";
import {
  deleteCloudProjectFile,
  deleteCloudProjectFolder,
  moveCloudProjectFile,
  moveCloudProjectFolder,
} from "../../features/cloud/cloudThunks";
import { closeCloudFiles } from "../../features/files/filesSlice";
import { useAppDispatch } from "../../store/hooks";
import type { useCloudWorkspaceHelpers } from "./useCloudWorkspaceHelpers";

type CloudWorkspaceHelpers = Pick<
  ReturnType<typeof useCloudWorkspaceHelpers>,
  | "assertCanWriteCloudProject"
  | "focusCloudItem"
  | "focusCloudSelection"
  | "refreshProjectTrees"
  | "retargetMovedCloudFiles"
>;

type MovableCloudSelectionItem =
  | Extract<CloudSelectionEntry, { itemType: "folder" }>
  | Extract<CloudSelectionEntry, { itemType: "file" }>;

export function useCloudMoveActions({
  assertCanWriteCloudProject,
  focusCloudItem,
  focusCloudSelection,
  refreshProjectTrees,
  retargetMovedCloudFiles,
}: CloudWorkspaceHelpers) {
  const dispatch = useAppDispatch();

  const requestFileMove = useCallback(
    (projectId: string, fileId: string, targetProjectId: string, targetFolderId: string | null) =>
      dispatch(
        moveCloudProjectFile({ projectId, fileId, targetProjectId, targetFolderId }),
      ).unwrap(),
    [dispatch],
  );

  const requestFolderMove = useCallback(
    (projectId: string, folderId: string, targetProjectId: string, targetParentId: string | null) =>
      dispatch(
        moveCloudProjectFolder({ projectId, folderId, targetProjectId, targetParentId }),
      ).unwrap(),
    [dispatch],
  );

  const moveCloudFile = useCallback(
    async (
      projectId: string,
      fileId: string,
      targetProjectId: string,
      targetFolderId: string | null,
    ) => {
      assertCanWriteCloudProject(projectId);
      assertCanWriteCloudProject(targetProjectId);
      const response = await requestFileMove(projectId, fileId, targetProjectId, targetFolderId);

      await refreshProjectTrees(projectId, targetProjectId);

      if (projectId !== targetProjectId) {
        retargetMovedCloudFiles([
          {
            sourceProjectId: projectId,
            targetProjectId,
            fileId: response.file.id,
            name: response.file.name,
          },
        ]);
      }

      focusCloudItem({
        projectId: targetProjectId,
        folderId: response.file.folderId ?? null,
        fileId: response.file.id,
        itemType: "file",
      });

      return response;
    },
    [
      assertCanWriteCloudProject,
      focusCloudItem,
      refreshProjectTrees,
      requestFileMove,
      retargetMovedCloudFiles,
    ],
  );

  const moveCloudFolder = useCallback(
    async (
      projectId: string,
      folderId: string,
      targetProjectId: string,
      targetParentId: string | null,
    ) => {
      assertCanWriteCloudProject(projectId);
      assertCanWriteCloudProject(targetProjectId);
      const response = await requestFolderMove(projectId, folderId, targetProjectId, targetParentId);

      await refreshProjectTrees(projectId, targetProjectId);

      if (projectId !== targetProjectId && response.movedFiles.length > 0) {
        retargetMovedCloudFiles(
          response.movedFiles.map((file) => ({
            sourceProjectId: projectId,
            targetProjectId,
            fileId: file.id,
            name: file.name,
          })),
        );
      }

      focusCloudItem({
        projectId: targetProjectId,
        folderId: response.folder.id,
        itemType: "folder",
      });

      return response;
    },
    [
      assertCanWriteCloudProject,
      focusCloudItem,
      refreshProjectTrees,
      requestFolderMove,
      retargetMovedCloudFiles,
    ],
  );

  const deleteCloudSelection = useCallback(
    async (projectId: string, items: MovableCloudSelectionItem[]) => {
      assertCanWriteCloudProject(projectId);
      const deletedFileIds = new Set<string>();

      for (const item of items) {
        if (item.itemType === "folder") {
          const response = await dispatch(
            deleteCloudProjectFolder({ projectId, folderId: item.folderId }),
          ).unwrap();
          response.deletedFileIds.forEach((fileId) => deletedFileIds.add(fileId));
        } else {
          await dispatch(
            deleteCloudProjectFile({ projectId, fileId: item.fileId }),
          ).unwrap();
          deletedFileIds.add(item.fileId);
        }
      }

      await refreshProjectTrees(projectId);

      if (deletedFileIds.size > 0) {
        dispatch(closeCloudFiles({ projectId, fileIds: Array.from(deletedFileIds) }));
      }

      dispatch(
        setCloudSelection({
          items: [createCloudSelectionEntry({ itemType: "project", projectId })],
        }),
      );
    },
    [assertCanWriteCloudProject, dispatch, refreshProjectTrees],
  );

  const moveCloudSelection = useCallback(
    async (
      projectId: string,
      items: MovableCloudSelectionItem[],
      targetProjectId: string,
      targetFolderId: string | null,
    ) => {
      assertCanWriteCloudProject(projectId);
      assertCanWriteCloudProject(targetProjectId);
      const movedSelection: CloudSelectionEntry[] = [];
      const retargetedFiles: Parameters<typeof retargetMovedCloudFiles>[0] = [];

      for (const item of items) {
        if (item.itemType === "folder") {
          const response = await requestFolderMove(
            projectId,
            item.folderId,
            targetProjectId,
            targetFolderId,
          );

          movedSelection.push(
            createCloudSelectionEntry({
              itemType: "folder",
              projectId: targetProjectId,
              folderId: response.folder.id,
              parentId: response.folder.parentId,
              name: response.folder.name,
            }),
          );

          if (projectId !== targetProjectId) {
            retargetedFiles.push(
              ...response.movedFiles.map((file) => ({
                sourceProjectId: projectId,
                targetProjectId,
                fileId: file.id,
                name: file.name,
              })),
            );
          }
        } else {
          const response = await requestFileMove(
            projectId,
            item.fileId,
            targetProjectId,
            targetFolderId,
          );

          movedSelection.push(
            createCloudSelectionEntry({
              itemType: "file",
              projectId: targetProjectId,
              fileId: response.file.id,
              folderId: response.file.folderId ?? null,
              name: response.file.name,
            }),
          );

          if (projectId !== targetProjectId) {
            retargetedFiles.push({
              sourceProjectId: projectId,
              targetProjectId,
              fileId: response.file.id,
              name: response.file.name,
            });
          }
        }
      }

      await refreshProjectTrees(projectId, targetProjectId);
      retargetMovedCloudFiles(retargetedFiles);
      focusCloudSelection(targetProjectId, movedSelection);
    },
    [
      assertCanWriteCloudProject,
      focusCloudSelection,
      refreshProjectTrees,
      requestFileMove,
      requestFolderMove,
      retargetMovedCloudFiles,
    ],
  );

  return {
    deleteCloudSelection,
    moveCloudFile,
    moveCloudFolder,
    moveCloudSelection,
  };
}
