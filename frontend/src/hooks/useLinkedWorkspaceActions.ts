import { useCallback, useMemo } from "react";
import * as cloudApi from "../features/cloud/cloudApi";
import { fetchProjectTree } from "../features/cloud/cloudThunks";
import {
  applyCloudFileSavedSnapshot,
  applyLocalFileSavedSnapshot,
  closeCloudFile,
  closeLocalFileByPath,
} from "../features/files/filesSlice";
import { applyPullPlan, applyPushPlan } from "../features/sync/syncApply";
import { mergeLinkedBindings } from "../features/sync/syncBindingMerge";
import {
  resolveActiveBindingForWorkspace,
  resolvePreviewBinding,
} from "../features/sync/syncBindingSelection";
import { getSelectedSyncPreviewItems } from "../features/sync/syncPreviewSelection";
import {
  assertCloudPreconditions,
  assertLocalPreconditions,
  collectBlockingDirtyTabs,
} from "../features/sync/syncGuards";
import { buildSyncPreview } from "../features/sync/syncPlanner";
import {
  buildCloudSyncSnapshot,
  buildLocalSyncSnapshot,
} from "../features/sync/syncSnapshots";
import {
  bindingsFailed,
  bindingsLoaded,
  bindingsLoading,
  closePreviewDialog,
  clearPreview,
  openPreviewDialog,
  operationFailed,
  operationStarted,
  operationSucceeded,
  previewFailed,
  previewReady,
  previewStarted,
  removeBinding,
  setBindingStatus,
  upsertBinding,
} from "../features/sync/syncSlice";
import * as syncApi from "../features/sync/syncApi";
import type {
  LinkedWorkspaceBinding,
  SyncDirection,
  SyncPlanItem,
  SyncScope,
} from "../features/sync/syncTypes";
import {
  setActiveBindingId,
  setWorkspaceMode,
} from "../features/workspace/workspaceSlice";
import { normalizeApiError } from "../lib/api/errorNormalization";
import { useAppDispatch, useAppSelector } from "../store/hooks";

function buildClientBindingKey(rootPath: string, projectId: string) {
  return `${projectId}:${rootPath}:${Date.now()}:${Math.random().toString(16).slice(2, 8)}`;
}

function resolveSnapshotTarget(scope: SyncScope, targetRelativePath?: string | null) {
  return scope === "file" ? targetRelativePath ?? null : null;
}

export function useLinkedWorkspaceActions() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(
    (state) => state.auth.sessionStatus === "authenticated",
  );
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const source = useAppSelector((state) => state.workspace.source);
  const activeProjectId = useAppSelector((state) => state.cloud.activeProjectId);
  const bindings = useAppSelector((state) => state.sync.bindings);
  const preview = useAppSelector((state) => state.sync.preview);
  const previewStatus = useAppSelector((state) => state.sync.previewStatus);
  const previewError = useAppSelector((state) => state.sync.previewError);
  const isPreviewDialogOpen = useAppSelector(
    (state) => state.sync.previewDialogOpen,
  );
  const filesState = useAppSelector((state) => state.files);

  const activeBinding = resolveActiveBindingForWorkspace({
    bindings,
    source,
    rootPath,
    activeProjectId,
  });
  const previewBinding = resolvePreviewBinding({ bindings, preview });

  const loadBindings = useCallback(async () => {
    if (!isAuthenticated) {
      dispatch(bindingsLoaded([]));
      return [];
    }

    dispatch(bindingsLoading());

    try {
      const [serverResponse, localResponse] = await Promise.all([
        syncApi.listProjectLinks(),
        window.electronAPI.listLinkBindings(),
      ]);
      const mergedBindings = mergeLinkedBindings(
        serverResponse.links,
        localResponse.bindings,
      );
      dispatch(bindingsLoaded(mergedBindings));
      return mergedBindings;
    } catch (error) {
      const apiError = normalizeApiError(error);
      dispatch(bindingsFailed(apiError.message));
      return [];
    }
  }, [dispatch, isAuthenticated]);

  const linkWorkspace = useCallback(
    async (projectId: string, projectName: string, localRootPath: string) => {
      dispatch(bindingsLoading());

      try {
        const clientBindingKey = buildClientBindingKey(localRootPath, projectId);
        const serverResponse = await syncApi.createProjectLink({
          projectId,
          clientBindingKey,
          localRootLabel:
            localRootPath.split(/[\\/]/).filter(Boolean).at(-1) ?? localRootPath,
        });

        const localBinding: LocalLinkBindingRecord = {
          bindingId: serverResponse.link.id,
          clientBindingKey,
          projectId,
          projectName,
          localRootPath,
          localRootLabel:
            localRootPath.split(/[\\/]/).filter(Boolean).at(-1) ?? localRootPath,
          lastKnownState: "linked_ready",
          updatedAt: new Date().toISOString(),
        };

        await window.electronAPI.saveLinkBinding(localBinding);

        const nextBinding: LinkedWorkspaceBinding = {
          ...serverResponse.link,
          localRootPath,
          status: "linked_ready",
        };

        dispatch(upsertBinding(nextBinding));
        dispatch(setActiveBindingId(nextBinding.id));
        dispatch(setWorkspaceMode("linked"));

        return { ok: true as const, binding: nextBinding };
      } catch (error) {
        const apiError = normalizeApiError(error);
        dispatch(bindingsFailed(apiError.message));
        return { ok: false as const, message: apiError.message };
      }
    },
    [dispatch],
  );

  const unlinkWorkspace = useCallback(
    async (binding: LinkedWorkspaceBinding) => {
      try {
        await syncApi.deleteProjectLink(binding.id);
        await window.electronAPI.removeLinkBinding(binding.id);
        dispatch(removeBinding(binding.id));
        dispatch(setActiveBindingId(null));
        dispatch(setWorkspaceMode(source === "cloud" ? "cloud" : "local"));
        dispatch(clearPreview());
        return { ok: true as const };
      } catch (error) {
        const apiError = normalizeApiError(error);
        return { ok: false as const, message: apiError.message };
      }
    },
    [dispatch, source],
  );

  const previewSync = useCallback(
    async (
      binding: LinkedWorkspaceBinding,
      direction: SyncDirection,
      scope: SyncScope,
      targetRelativePath?: string | null,
    ) => {
      if (!binding.localRootPath) {
        dispatch(
          previewFailed(
            "Для этой связи на текущем устройстве не найден локальный путь.",
          ),
        );
        return null;
      }

      const snapshotTarget = resolveSnapshotTarget(scope, targetRelativePath);

      dispatch(previewStarted());
      dispatch(setBindingStatus({ bindingId: binding.id, status: "scan_required" }));

      try {
        const [localSnapshot, cloudSnapshot] = await Promise.all([
          buildLocalSyncSnapshot(binding.localRootPath, {
            targetRelativePath: snapshotTarget,
          }),
          buildCloudSyncSnapshot(binding.projectId, {
            targetRelativePath: snapshotTarget,
          }),
        ]);
        const blockingRelativePaths = collectBlockingDirtyTabs(
          filesState,
          binding,
          cloudSnapshot,
        );
        const nextPreview = buildSyncPreview({
          binding,
          direction,
          scope,
          targetRelativePath,
          localSnapshot,
          cloudSnapshot,
          blockingRelativePaths,
        });

        dispatch(previewReady(nextPreview));
        dispatch(setBindingStatus({ bindingId: binding.id, status: "preview_ready" }));
        return nextPreview;
      } catch (error) {
        const apiError = normalizeApiError(error);
        dispatch(previewFailed(apiError.message));
        dispatch(setBindingStatus({ bindingId: binding.id, status: "sync_error" }));
        return null;
      }
    },
    [dispatch, filesState],
  );

  const syncOpenEditors = useCallback(
    async (
      binding: LinkedWorkspaceBinding,
      appliedItems: SyncPlanItem[],
      direction: SyncDirection,
    ) => {
      if (!binding.localRootPath) {
        return;
      }

      if (direction === "push") {
        const cloudSnapshot = await buildCloudSyncSnapshot(binding.projectId);
        const cloudFileByPath = new Map(
          cloudSnapshot.files.map((file) => [file.relativePath, file]),
        );

        for (const item of appliedItems) {
          if (item.kind !== "file") {
            continue;
          }

          if (item.action === "delete" && item.cloudFileId) {
            dispatch(
              closeCloudFile({ projectId: binding.projectId, fileId: item.cloudFileId }),
            );
            continue;
          }

          const cloudFile = cloudFileByPath.get(item.relativePath);

          if (!cloudFile) {
            continue;
          }

          const response = await cloudApi.getProjectFile(binding.projectId, cloudFile.id);

          dispatch(
            applyCloudFileSavedSnapshot({
              fileId: response.file.id,
              content: response.file.content,
              version: response.file.version,
              updatedAt: response.file.updatedAt,
            }),
          );
        }

        return;
      }

      for (const item of appliedItems) {
        if (item.kind !== "file") {
          continue;
        }

        if (item.action === "delete" && item.localPath) {
          dispatch(closeLocalFileByPath(item.localPath));
          continue;
        }

        if (!item.localPath) {
          continue;
        }

        const content = await window.electronAPI.readFile(item.localPath);
        dispatch(
          applyLocalFileSavedSnapshot({
            path: item.localPath,
            content,
          }),
        );
      }
    },
    [dispatch],
  );

  const applyPreview = useCallback(
    async (binding: LinkedWorkspaceBinding, selectedItemKeys: Set<string>) => {
      if (!preview || preview.bindingId !== binding.id || !binding.localRootPath) {
        return {
          ok: false as const,
          message: "Нет подготовленного preview для синхронизации.",
        };
      }

      const selectedItems = getSelectedSyncPreviewItems(preview, selectedItemKeys);

      if (selectedItems.length === 0) {
        return {
          ok: false as const,
          message: "Выберите хотя бы одно изменение для синхронизации.",
        };
      }

      const operation = {
        bindingId: binding.id,
        direction: preview.direction,
        scope: preview.scope,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        error: null,
      };

      dispatch(operationStarted(operation));
      dispatch(setBindingStatus({ bindingId: binding.id, status: "sync_in_progress" }));

      try {
        const snapshotTarget = resolveSnapshotTarget(
          preview.scope,
          preview.targetRelativePath,
        );
        const [localSnapshot, cloudSnapshot] = await Promise.all([
          buildLocalSyncSnapshot(binding.localRootPath, {
            targetRelativePath: snapshotTarget,
          }),
          buildCloudSyncSnapshot(binding.projectId, {
            targetRelativePath: snapshotTarget,
          }),
        ]);

        if (selectedItems.some((item) => item.blockedByDirtyTab)) {
          throw new Error("Среди выбранных элементов есть заблокированные изменения.");
        }

        const localCheck = assertLocalPreconditions(selectedItems, localSnapshot);

        if (!localCheck.ok) {
          throw new Error(localCheck.error);
        }

        const cloudCheck = assertCloudPreconditions(selectedItems, cloudSnapshot);

        if (!cloudCheck.ok) {
          throw new Error(cloudCheck.error);
        }

        if (preview.direction === "push") {
          await applyPushPlan({
            items: selectedItems,
            cloudSnapshot,
            localRootPath: binding.localRootPath,
          });
        } else {
          await applyPullPlan({
            items: selectedItems,
            projectId: binding.projectId,
            localRootPath: binding.localRootPath,
          });
        }

        const syncSummaryResponse = await syncApi.updateProjectLinkSyncSummary(
          binding.id,
          {
            lastSyncAt: new Date().toISOString(),
            lastSyncDirection: preview.direction,
          },
        );
        const nextBinding: LinkedWorkspaceBinding = {
          ...syncSummaryResponse.link,
          localRootPath: binding.localRootPath,
          status: "linked_ready",
        };

        await window.electronAPI.saveLinkBinding({
          bindingId: binding.id,
          clientBindingKey: binding.clientBindingKey,
          projectId: binding.projectId,
          projectName: binding.projectName,
          localRootPath: binding.localRootPath,
          localRootLabel: binding.localRootLabel,
          lastKnownState: "linked_ready",
          updatedAt: new Date().toISOString(),
        });

        dispatch(upsertBinding(nextBinding));
        dispatch(fetchProjectTree({ projectId: binding.projectId }));
        await syncOpenEditors(binding, selectedItems, preview.direction);
        dispatch(clearPreview());

        const completedOperation = {
          ...operation,
          finishedAt: new Date().toISOString(),
        };
        dispatch(operationSucceeded(completedOperation));
        return { ok: true as const };
      } catch (error) {
        const apiError = normalizeApiError(error);
        const failedOperation = {
          ...operation,
          finishedAt: new Date().toISOString(),
          error: apiError.message,
        };

        dispatch(operationFailed({ operation: failedOperation, error: apiError.message }));
        dispatch(setBindingStatus({ bindingId: binding.id, status: "sync_error" }));
        return { ok: false as const, message: apiError.message };
      }
    },
    [dispatch, preview, syncOpenEditors],
  );

  const openSyncPreview = useCallback(
    async (
      binding: LinkedWorkspaceBinding,
      direction: SyncDirection,
      scope: SyncScope,
      targetRelativePath?: string | null,
    ) => {
      dispatch(openPreviewDialog());
      return previewSync(binding, direction, scope, targetRelativePath);
    },
    [dispatch, previewSync],
  );

  const closeSyncPreviewDialog = useCallback(() => {
    dispatch(closePreviewDialog());
  }, [dispatch]);

  return useMemo(
    () => ({
      bindings,
      activeBinding,
      preview,
      previewStatus,
      previewError,
      isPreviewDialogOpen,
      loadBindings,
      linkWorkspace,
      unlinkWorkspace,
      previewSync,
      openSyncPreview,
      closeSyncPreviewDialog,
      applyPreview,
      previewBinding,
    }),
    [
      bindings,
      activeBinding,
      preview,
      previewStatus,
      previewError,
      isPreviewDialogOpen,
      loadBindings,
      linkWorkspace,
      unlinkWorkspace,
      previewSync,
      openSyncPreview,
      closeSyncPreviewDialog,
      applyPreview,
      previewBinding,
    ],
  );
}
