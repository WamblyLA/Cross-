import { useEffect } from "react";
import { setActiveBindingId, setWorkspaceMode } from "../features/workspace/workspaceSlice";
import { resolveActiveBindingForWorkspace } from "../features/sync/syncBindingSelection";
import { useLinkedWorkspaceActions } from "./useLinkedWorkspaceActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";

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

    const matchedBinding = resolveActiveBindingForWorkspace({
      bindings,
      source,
      rootPath,
      activeProjectId,
    });

    if (matchedBinding) {
      dispatch(setActiveBindingId(matchedBinding.id));
      dispatch(setWorkspaceMode("linked"));
      return;
    }

    dispatch(setActiveBindingId(null));
    dispatch(setWorkspaceMode(source === "cloud" ? "cloud" : "local"));
  }, [activeProjectId, bindings, dispatch, isAuthenticated, rootPath, source]);
}
