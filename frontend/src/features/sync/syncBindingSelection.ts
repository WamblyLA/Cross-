import type { WorkspaceSource } from "../cloud/cloudTypes";
import type { SyncPreview, LinkedWorkspaceBinding } from "./syncTypes";

function normalizePath(filePath: string | null) {
  return `${filePath ?? ""}`.replace(/[\\/]+$/, "").toLowerCase();
}

export function findBindingById(
  bindings: LinkedWorkspaceBinding[],
  bindingId: string | null | undefined,
): LinkedWorkspaceBinding | null {
  if (!bindingId) {
    return null;
  }

  return bindings.find((binding) => binding.id === bindingId) ?? null;
}

export function findBindingByExactRootPath(
  bindings: LinkedWorkspaceBinding[],
  rootPath: string | null,
): LinkedWorkspaceBinding | null {
  if (!rootPath) {
    return null;
  }

  const normalizedRootPath = normalizePath(rootPath);

  return (
    bindings.find((binding) => normalizePath(binding.localRootPath) === normalizedRootPath) ?? null
  );
}

export function resolveActiveBindingForWorkspace(params: {
  bindings: LinkedWorkspaceBinding[];
  source: WorkspaceSource;
  rootPath: string | null;
  activeProjectId: string | null;
}): LinkedWorkspaceBinding | null {
  const bindingForRoot = findBindingByExactRootPath(params.bindings, params.rootPath);

  if (params.source === "cloud") {
    if (!bindingForRoot || !params.activeProjectId) {
      return null;
    }

    return bindingForRoot.projectId === params.activeProjectId ? bindingForRoot : null;
  }

  return bindingForRoot;
}

export function resolvePreviewBinding(params: {
  bindings: LinkedWorkspaceBinding[];
  preview: SyncPreview | null;
}): LinkedWorkspaceBinding | null {
  if (!params.preview) {
    return null;
  }

  return findBindingById(params.bindings, params.preview.bindingId);
}
