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
  } = useLinkedWorkspaceActions();
  const operationStatus = useAppSelector((state) => state.sync.operationStatus);
  const operationError = useAppSelector((state) => state.sync.operationError);

  return (
    <SyncPreviewDialog
      isOpen={isPreviewDialogOpen}
      preview={preview}
      isLoading={previewStatus === "loading"}
      isApplying={operationStatus === "loading"}
      error={previewError ?? operationError}
      onClose={closeSyncPreviewDialog}
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
