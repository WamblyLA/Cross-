import { useAppSelector } from "../../store/hooks";
import { useLinkedWorkspaceActions } from "../../hooks/useLinkedWorkspaceActions";
import SyncPreviewDialog from "./SyncPreviewDialog";

export default function LinkedWorkspaceSyncDialogs() {
  const {
    activeBinding,
    preview,
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
      isApplying={operationStatus === "loading"}
      error={operationError}
      onClose={closeSyncPreviewDialog}
      onApply={async (confirmedDeletePaths) => {
        if (!activeBinding) {
          return;
        }

        const result = await applyPreview(activeBinding, confirmedDeletePaths);

        if (result.ok) {
          closeSyncPreviewDialog();
        }
      }}
    />
  );
}
