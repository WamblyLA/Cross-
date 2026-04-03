import { useMemo, useState } from "react";
import { selectIsAuthenticated } from "../../../features/auth/authSelectors";
import { selectCloudProjects, selectCloudTreeForProject } from "../../../features/cloud/cloudSelectors";
import { selectActiveFile } from "../../../features/files/filesSelectors";
import { SYNC_UI_TEXT } from "../../../features/sync/syncUiText";
import { useLinkedWorkspaceActions } from "../../../hooks/useLinkedWorkspaceActions";
import { useAppSelector } from "../../../store/hooks";
import LinkWorkspaceDialog from "../../Sync/LinkWorkspaceDialog";
import SyncPreviewDialog from "../../Sync/SyncPreviewDialog";

function findCloudRelativePathByFileId(
  tree: ReturnType<typeof selectCloudTreeForProject>,
  fileId: string,
  parentRelativePath = "",
): string | null {
  if (!tree) {
    return null;
  }

  for (const file of tree.files) {
    if (file.id === fileId) {
      return parentRelativePath ? `${parentRelativePath}/${file.name}` : file.name;
    }
  }

  for (const folder of tree.folders) {
    const nextRelativePath = parentRelativePath ? `${parentRelativePath}/${folder.name}` : folder.name;

    for (const file of folder.files) {
      if (file.id === fileId) {
        return `${nextRelativePath}/${file.name}`;
      }
    }

    const nested = findCloudRelativePathByFileId(
      {
        projectId: tree.projectId,
        folders: folder.folders,
        files: [],
      },
      fileId,
      nextRelativePath,
    );

    if (nested) {
      return nested;
    }
  }

  return null;
}

export default function LinkedWorkspaceBanner() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const activeFile = useAppSelector(selectActiveFile);
  const cloudProjects = useAppSelector(selectCloudProjects);
  const { activeBinding, preview, previewSync, linkWorkspace, unlinkWorkspace, applyPreview } =
    useLinkedWorkspaceActions();
  const cloudTree = useAppSelector((state) =>
    selectCloudTreeForProject(state, activeBinding?.projectId ?? null),
  );
  const operationStatus = useAppSelector((state) => state.sync.operationStatus);
  const operationError = useAppSelector((state) => state.sync.operationError);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const singleFileRelativePath = useMemo(() => {
    if (!activeBinding || !activeFile) {
      return null;
    }

    if (activeFile.kind === "local" && activeBinding.localRootPath) {
      const normalizedRoot = activeBinding.localRootPath.replace(/[\\/]+$/, "");

      if (activeFile.path.startsWith(normalizedRoot)) {
        return activeFile.path
          .slice(normalizedRoot.length)
          .replace(/^[\\/]+/, "")
          .replace(/[\\]+/g, "/");
      }
    }

    if (activeFile.kind === "cloud" && activeFile.projectId === activeBinding.projectId) {
      return findCloudRelativePathByFileId(cloudTree, activeFile.fileId);
    }

    return null;
  }, [activeBinding, activeFile, cloudTree]);

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
                className="ui-control px-2 py-1 text-xs"
                onClick={() => {
                  void unlinkWorkspace(activeBinding);
                }}
              >
                {SYNC_UI_TEXT.unlinkWorkspace}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-button-primary ui-control px-3 py-2 text-xs"
                onClick={() => {
                  void previewSync(activeBinding, "push", "workspace").then((nextPreview) => {
                    if (nextPreview) {
                      setIsPreviewOpen(true);
                    }
                  });
                }}
              >
                {SYNC_UI_TEXT.pushToCloud}
              </button>
              <button
                type="button"
                className="ui-control px-3 py-2 text-xs"
                onClick={() => {
                  void previewSync(activeBinding, "pull", "workspace").then((nextPreview) => {
                    if (nextPreview) {
                      setIsPreviewOpen(true);
                    }
                  });
                }}
              >
                {SYNC_UI_TEXT.pullFromCloud}
              </button>
              <button
                type="button"
                className="ui-control px-3 py-2 text-xs"
                disabled={!singleFileRelativePath}
                onClick={() => {
                  if (!singleFileRelativePath) {
                    return;
                  }

                  void previewSync(activeBinding, "push", "file", singleFileRelativePath).then((nextPreview) => {
                    if (nextPreview) {
                      setIsPreviewOpen(true);
                    }
                  });
                }}
              >
                {SYNC_UI_TEXT.pushFile}
              </button>
              <button
                type="button"
                className="ui-control px-3 py-2 text-xs"
                disabled={!singleFileRelativePath}
                onClick={() => {
                  if (!singleFileRelativePath) {
                    return;
                  }

                  void previewSync(activeBinding, "pull", "file", singleFileRelativePath).then((nextPreview) => {
                    if (nextPreview) {
                      setIsPreviewOpen(true);
                    }
                  });
                }}
              >
                {SYNC_UI_TEXT.pullFile}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-secondary">Локальная папка пока не связана с облачным проектом.</div>
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

      <SyncPreviewDialog
        isOpen={isPreviewOpen}
        preview={preview}
        isApplying={operationStatus === "loading"}
        error={operationError}
        onClose={() => setIsPreviewOpen(false)}
        onApply={async (confirmedDeletePaths) => {
          if (!activeBinding) {
            return;
          }

          const result = await applyPreview(activeBinding, confirmedDeletePaths);

          if (result.ok) {
            setIsPreviewOpen(false);
          }
        }}
      />
    </>
  );
}
