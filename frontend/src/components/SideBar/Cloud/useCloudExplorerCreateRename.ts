import { useCallback } from "react";
import { selectCloudItem } from "../../../features/cloud/cloudSlice";
import { normalizeApiError } from "../../../lib/api/errorNormalization";
import type { CloudExplorerSelectionItem } from "./cloudExplorerSelection";
import type { useCloudExplorerState } from "./useCloudExplorerState";

type CloudExplorerState = ReturnType<typeof useCloudExplorerState>;

export function useCloudExplorerCreateRename(state: CloudExplorerState) {
  const beginProjectCreate = useCallback(() => {
    state.resetMessages();
    state.setDeleteTarget(null);
    state.setDraft({ kind: "project", mode: "create", value: "" });
  }, [state]);

  const beginProjectRename = useCallback(
    (projectId: string, name: string) => {
      state.resetMessages();
      state.setDeleteTarget(null);
      state.setDraft({ kind: "project", mode: "rename", projectId, value: name });
      state.dispatch(selectCloudItem({ projectId, folderId: null, fileId: null, itemType: "project" }));
    },
    [state],
  );

  const beginProjectDelete = useCallback(
    (projectId: string, name: string) => {
      state.resetMessages();
      state.setDraft(null);
      state.setDeleteTarget({ kind: "project", projectId, name });
      state.dispatch(selectCloudItem({ projectId, folderId: null, fileId: null, itemType: "project" }));
    },
    [state],
  );

  const beginFolderCreate = useCallback(
    async (projectIdOverride?: string, parentId: string | null = null) => {
      state.resetMessages();

      const projectId = projectIdOverride ?? state.activeProjectId;

      if (!projectId) {
        state.setLocalError("Сначала откройте облачный проект, чтобы создать папку.");
        return;
      }

      if (projectId !== state.activeProjectId) {
        try {
          await state.workspaceActions.openCloudProject(projectId);
        } catch (error) {
          state.setLocalError(normalizeApiError(error).message);
          return;
        }
      }

      state.setDeleteTarget(null);
      state.setDraft({ kind: "folder", mode: "create", projectId, parentId, value: "" });

      if (parentId) {
        state.setExpandedFolderIds((currentIds) =>
          currentIds.includes(parentId) ? currentIds : [...currentIds, parentId],
        );
      }
    },
    [state],
  );

  const beginFolderRename = useCallback(
    (projectId: string, folderId: string, parentId: string | null, name: string) => {
      state.resetMessages();
      state.setDeleteTarget(null);
      state.setDraft({
        kind: "folder",
        mode: "rename",
        projectId,
        parentId,
        folderId,
        value: name,
      });
      state.dispatch(selectCloudItem({ projectId, folderId, fileId: null, itemType: "folder" }));
    },
    [state],
  );

  const beginFolderDelete = useCallback(
    (projectId: string, folderId: string, name: string) => {
      state.resetMessages();
      state.setDraft(null);
      state.setDeleteTarget({ kind: "folder", projectId, folderId, name });
      state.dispatch(selectCloudItem({ projectId, folderId, fileId: null, itemType: "folder" }));
    },
    [state],
  );

  const beginFileCreate = useCallback(
    async (projectIdOverride?: string, folderId: string | null = null) => {
      state.resetMessages();

      const projectId = projectIdOverride ?? state.activeProjectId;

      if (!projectId) {
        state.setLocalError("Сначала откройте облачный проект, чтобы создать файл.");
        return;
      }

      if (projectId !== state.activeProjectId) {
        try {
          await state.workspaceActions.openCloudProject(projectId);
        } catch (error) {
          state.setLocalError(normalizeApiError(error).message);
          return;
        }
      }

      state.setDeleteTarget(null);
      state.setDraft({ kind: "file", mode: "create", projectId, folderId, value: "" });

      if (folderId) {
        state.setExpandedFolderIds((currentIds) =>
          currentIds.includes(folderId) ? currentIds : [...currentIds, folderId],
        );
      }
    },
    [state],
  );

  const beginFileRename = useCallback(
    (projectId: string, fileId: string, folderId: string | null, name: string) => {
      state.resetMessages();
      state.setDeleteTarget(null);
      state.setDraft({
        kind: "file",
        mode: "rename",
        projectId,
        folderId,
        fileId,
        value: name,
      });
      state.dispatch(selectCloudItem({ projectId, folderId, fileId, itemType: "file" }));
    },
    [state],
  );

  const beginFileDelete = useCallback(
    (projectId: string, fileId: string, name: string) => {
      state.resetMessages();
      state.setDraft(null);
      state.setDeleteTarget({ kind: "file", projectId, fileId, name });
      state.dispatch(selectCloudItem({ projectId, folderId: null, fileId, itemType: "file" }));
    },
    [state],
  );

  const beginSelectionDelete = useCallback(
    (items: CloudExplorerSelectionItem[]) => {
      if (items.length === 0) {
        return;
      }

      const folderCount = items.filter((item) => item.itemType === "folder").length;
      const fileCount = items.length - folderCount;

      state.resetMessages();
      state.setDraft(null);
      state.setDeleteTarget({
        kind: "selection",
        projectId: items[0].projectId,
        items,
        folderCount,
        fileCount,
      });
    },
    [state],
  );

  const handleDraftSubmit = useCallback(async () => {
    if (!state.draft) {
      return;
    }

    const nextName = state.draft.value.trim();

    if (!nextName) {
      state.setDraft(null);
      return;
    }

    state.resetMessages();

    try {
      if (state.draft.kind === "project" && state.draft.mode === "create") {
        await state.workspaceActions.createCloudProject(nextName);
        state.setDraft(null);
        return;
      }

      if (state.draft.kind === "project" && state.draft.mode === "rename" && state.draft.projectId) {
        await state.workspaceActions.renameCloudProject(state.draft.projectId, nextName);
        state.setDraft(null);
        return;
      }

      if (state.draft.kind === "folder" && state.draft.mode === "create") {
        const folder = await state.workspaceActions.createCloudFolder(
          state.draft.projectId,
          nextName,
          state.draft.parentId,
        );
        state.setExpandedFolderIds((currentIds) =>
          currentIds.includes(folder.id) ? currentIds : [...currentIds, folder.id],
        );
        state.setDraft(null);
        return;
      }

      if (state.draft.kind === "folder" && state.draft.mode === "rename" && state.draft.folderId) {
        await state.workspaceActions.renameCloudFolder(
          state.draft.projectId,
          state.draft.folderId,
          nextName,
        );
        state.setDraft(null);
        return;
      }

      if (state.draft.kind === "file" && state.draft.mode === "create") {
        await state.workspaceActions.createCloudFile(
          state.draft.projectId,
          nextName,
          "",
          state.draft.folderId,
        );
        state.setDraft(null);
        return;
      }

      if (state.draft.kind === "file" && state.draft.mode === "rename" && state.draft.fileId) {
        await state.workspaceActions.renameCloudFile(
          state.draft.projectId,
          state.draft.fileId,
          nextName,
        );
        state.setDraft(null);
      }
    } catch (error) {
      state.setLocalError(normalizeApiError(error).message);
    }
  }, [state]);

  return {
    beginProjectCreate,
    beginProjectRename,
    beginProjectDelete,
    beginFolderCreate,
    beginFolderRename,
    beginFolderDelete,
    beginFileCreate,
    beginFileRename,
    beginFileDelete,
    beginSelectionDelete,
    handleDraftSubmit,
  };
}
