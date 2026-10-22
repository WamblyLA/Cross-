import { useMemo } from "react";
import { selectCloudActiveProject } from "../../features/cloud/cloudSelectors";
import { selectActiveFile, selectOpenedFiles } from "../../features/files/filesSelectors";
import {
  buildRunWorkspaceCacheKey,
  buildRunWorkspaceDescriptor,
} from "../../features/run/runUtils";
import { useAppSelector } from "../../store/hooks";

function resolveWorkspaceStateKey(
  workspaceDescriptor: ReturnType<typeof buildRunWorkspaceDescriptor>,
) {
  if (!workspaceDescriptor) {
    return null;
  }

  return workspaceDescriptor.scope === "local"
    ? `local:${workspaceDescriptor.rootPath}`
    : `cloud:${workspaceDescriptor.projectId}`;
}

export function useRunWorkspaceContext() {
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const activeFile = useAppSelector(selectActiveFile);
  const openedFiles = useAppSelector(selectOpenedFiles);
  const activeCloudProject = useAppSelector(selectCloudActiveProject);
  const activeFileKind = activeFile?.kind ?? null;
  const activeFilePath = activeFile?.kind === "local" ? activeFile.path : null;
  const activeFileProjectId = activeFile?.kind === "cloud" ? activeFile.projectId : null;
  const activeFileId = activeFile?.kind === "cloud" ? activeFile.fileId : null;
  const activeFileExtension = activeFile?.extension ?? null;
  const activeCloudProjectId = activeCloudProject?.id ?? null;
  const activeCloudProjectName = activeCloudProject?.name ?? null;

  const runActiveFile = useMemo(() => {
    if (activeFileKind === "local" && activeFilePath) {
      return { kind: "local" as const, path: activeFilePath, extension: activeFileExtension };
    }
    if (activeFileKind === "cloud" && activeFileProjectId && activeFileId) {
      return {
        kind: "cloud" as const,
        projectId: activeFileProjectId,
        fileId: activeFileId,
        extension: activeFileExtension,
      };
    }
    return null;
  }, [activeFileExtension, activeFileId, activeFileKind, activeFilePath, activeFileProjectId]);

  const runActiveCloudProject = useMemo(
    () =>
      activeCloudProjectId && activeCloudProjectName
        ? { id: activeCloudProjectId, name: activeCloudProjectName }
        : null,
    [activeCloudProjectId, activeCloudProjectName],
  );
  const workspaceDescriptor = useMemo(
    () => buildRunWorkspaceDescriptor({ source, rootPath, activeFile: runActiveFile, activeCloudProject: runActiveCloudProject }),
    [source, rootPath, runActiveCloudProject, runActiveFile],
  );
  const workspaceCacheKey = useMemo(
    () => buildRunWorkspaceCacheKey(workspaceDescriptor),
    [workspaceDescriptor],
  );
  const workspaceStateKey = useMemo(
    () => resolveWorkspaceStateKey(workspaceDescriptor),
    [workspaceDescriptor],
  );

  return {
    activeCloudProject,
    activeFile,
    openedFiles,
    rootPath,
    source,
    workspaceCacheKey,
    workspaceDescriptor,
    workspaceStateKey,
  };
}
