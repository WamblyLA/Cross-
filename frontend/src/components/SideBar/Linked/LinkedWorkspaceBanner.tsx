import { useState } from "react";
import { VscCloudDownload, VscCloudUpload, VscDebugDisconnect } from "react-icons/vsc";
import { selectIsAuthenticated } from "../../../features/auth/authSelectors";
import { selectCloudProjects } from "../../../features/cloud/cloudSelectors";
import { SYNC_UI_TEXT } from "../../../features/sync/syncUiText";
import { useLinkedWorkspaceActions } from "../../../hooks/useLinkedWorkspaceActions";
import { useAppSelector } from "../../../store/hooks";
import LinkWorkspaceDialog from "../../Sync/LinkWorkspaceDialog";

export default function LinkedWorkspaceBanner() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const cloudProjects = useAppSelector(selectCloudProjects);
  const { activeBinding, openSyncPreview, linkWorkspace, unlinkWorkspace } =
    useLinkedWorkspaceActions();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  if (!activeBinding && !rootPath) {
    return null;
  }

  return (
    <>
      <div className="border-b border-default bg-panel px-3 py-3">
        {activeBinding ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="ui-eyebrow">{SYNC_UI_TEXT.linkedBadge}</div>
                <div className="truncate text-sm text-primary">{activeBinding.projectName}</div>
              </div>
              <button
                type="button"
                className="ui-control h-8 w-8 rounded-md border border-default bg-editor text-secondary"
                onClick={() => {
                  void unlinkWorkspace(activeBinding);
                }}
                aria-label={SYNC_UI_TEXT.unlinkWorkspace}
                title={SYNC_UI_TEXT.unlinkWorkspace}
              >
                <VscDebugDisconnect className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-button-primary ui-control h-8 w-8 rounded-md"
                onClick={() => {
                  void openSyncPreview(activeBinding, "push", "workspace");
                }}
                aria-label={SYNC_UI_TEXT.pushToCloud}
                title={SYNC_UI_TEXT.pushToCloud}
              >
                <VscCloudUpload className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="ui-control h-8 w-8 rounded-md border border-default bg-editor text-secondary"
                onClick={() => {
                  void openSyncPreview(activeBinding, "pull", "workspace");
                }}
                aria-label={SYNC_UI_TEXT.pullFromCloud}
                title={SYNC_UI_TEXT.pullFromCloud}
              >
                <VscCloudDownload className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-secondary">
              Локальная папка пока не связана с облачным проектом.
            </div>
            <button
              type="button"
              className="ui-button-primary ui-control px-3 py-2 text-xs"
              onClick={() => setIsLinkDialogOpen(true)}
            >
              {SYNC_UI_TEXT.linkWorkspace}
            </button>
          </div>
        )}
      </div>

      <LinkWorkspaceDialog
        isOpen={isLinkDialogOpen}
        projects={cloudProjects}
        onClose={() => setIsLinkDialogOpen(false)}
        onConfirm={async (project) => {
          if (!rootPath) {
            throw new Error("Сначала откройте локальную папку.");
          }

          const result = await linkWorkspace(project.id, project.name, rootPath);

          if (!result.ok) {
            throw new Error(result.message);
          }

          setIsLinkDialogOpen(false);
        }}
      />
    </>
  );
}
