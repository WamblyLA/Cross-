import { useEffect, useMemo, useState } from "react";
import type {
  LinkedWorkspaceBinding,
  SyncDirection,
  SyncScope,
} from "../../features/sync/syncTypes";
import { selectOpenedFiles } from "../../features/files/filesSelectors";
import { useWorkspaceActions } from "../../hooks/useWorkspaceActions";
import { useAppSelector } from "../../store/hooks";
import { useLinkedWorkspaceActions } from "../../hooks/useLinkedWorkspaceActions";
import SyncPreviewDialog from "./SyncPreviewDialog";

export default function LinkedWorkspaceSyncDialogs() {
  const {
    preview,
    previewBinding,
    previewStatus,
    previewError,
    isPreviewDialogOpen,
    applyPreview,
    closeSyncPreviewDialog,
    openSyncPreview,
  } = useLinkedWorkspaceActions();
  const { saveAllOpenedFiles } = useWorkspaceActions();
  const openedFiles = useAppSelector(selectOpenedFiles);
  const operationStatus = useAppSelector((state) => state.sync.operationStatus);
  const operationError = useAppSelector((state) => state.sync.operationError);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllError, setSaveAllError] = useState<string | null>(null);
  const [pendingPreviewRefresh, setPendingPreviewRefresh] = useState<{
    binding: LinkedWorkspaceBinding;
    direction: SyncDirection;
    scope: SyncScope;
    targetRelativePath?: string | null;
  } | null>(null);

  const dirtyOpenFilesCount = useMemo(
    () =>
      openedFiles.filter(
        (file) => file.isDirty && !(file.kind === "cloud" && file.canWrite === false),
      ).length,
    [openedFiles],
  );

  useEffect(() => {
    if (!isPreviewDialogOpen) {
      setIsSavingAll(false);
      setSaveAllError(null);
      setPendingPreviewRefresh(null);
    }
  }, [isPreviewDialogOpen]);

  useEffect(() => {
    if (!pendingPreviewRefresh || isSavingAll) {
      return;
    }

    let isCancelled = false;

    void openSyncPreview(
      pendingPreviewRefresh.binding,
      pendingPreviewRefresh.direction,
      pendingPreviewRefresh.scope,
      pendingPreviewRefresh.targetRelativePath,
    ).finally(() => {
      if (!isCancelled) {
        setPendingPreviewRefresh(null);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isSavingAll, openSyncPreview, pendingPreviewRefresh]);

  return (
    <SyncPreviewDialog
      isOpen={isPreviewDialogOpen}
      preview={preview}
      isLoading={previewStatus === "loading"}
      isApplying={operationStatus === "loading"}
      isSavingAll={isSavingAll}
      dirtyOpenFilesCount={dirtyOpenFilesCount}
      error={saveAllError ?? previewError ?? operationError}
      onClose={closeSyncPreviewDialog}
      onSaveAll={async () => {
        setIsSavingAll(true);
        setSaveAllError(null);

        try {
          const result = await saveAllOpenedFiles();

          if (!result.ok) {
            setSaveAllError(
              result.failures[0]?.result.message ??
                "Не удалось сохранить все файлы.",
            );
            return;
          }

          if (previewBinding && preview) {
            setPendingPreviewRefresh({
              binding: previewBinding,
              direction: preview.direction,
              scope: preview.scope,
              targetRelativePath: preview.targetRelativePath,
            });
          }
        } finally {
          setIsSavingAll(false);
        }
      }}
      onApply={async (selectedItemKeys) => {
        if (!previewBinding) {
          return;
        }

        const result = await applyPreview(previewBinding, selectedItemKeys);

        if (result.ok) {
          closeSyncPreviewDialog();
        }
      }}
    />
  );
}
