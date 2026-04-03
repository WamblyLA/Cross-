import { useEffect } from "react";
import { setActiveBindingId, setWorkspaceMode } from "../features/workspace/workspaceSlice";
import { useLinkedWorkspaceActions } from "./useLinkedWorkspaceActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";

function normalizePath(filePath: string | null) {
  return `${filePath ?? ""}`.replace(/[\\/]+$/, "").toLowerCase();
}

export function useLinkedWorkspaceBootstrap() {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const activeProjectId = useAppSelector((state) => state.cloud.activeProjectId);
  const isAuthenticated = useAppSelector((state) => state.auth.sessionStatus === "authenticated");
  const { bindings, loadBindings } = useLinkedWorkspaceActions();

  useEffect(() => {
    void loadBindings();
  }, [loadBindings]);

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(setActiveBindingId(null));
      dispatch(setWorkspaceMode(rootPath ? "local" : source === "cloud" ? "cloud" : "local"));
      return;
    }

    const matchedBinding =
      source === "local"
        ? bindings.find((binding) => normalizePath(binding.localRootPath) === normalizePath(rootPath)) ??
          null
        : bindings.find((binding) => binding.projectId === activeProjectId) ?? null;

    if (matchedBinding) {
      dispatch(setActiveBindingId(matchedBinding.id));
      dispatch(setWorkspaceMode("linked"));
      return;
    }

    dispatch(setActiveBindingId(null));
    dispatch(setWorkspaceMode(source === "cloud" ? "cloud" : "local"));
  }, [activeProjectId, bindings, dispatch, isAuthenticated, rootPath, source]);
}
