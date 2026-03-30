import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import VisualSettingsDialog from "../components/settings/VisualSettingsDialog";
import TopBar from "../components/TopBar/TopBar";
import { selectIsAuthenticated } from "../features/auth/authSelectors";
import { selectCloudProjectsStatus } from "../features/cloud/cloudSelectors";
import { fetchProjects } from "../features/cloud/cloudThunks";
import { showBottomPanel } from "../features/panel/panelSlice";
import { appendRunConsoleChunk } from "../features/run/runConsoleStore";
import { runSessionChanged } from "../features/run/runSlice";
import {
  appendTerminalConsoleChunk,
  clearTerminalConsoleSession,
} from "../features/terminal/terminalConsoleStore";
import {
  terminalSessionClosed,
  terminalSessionsLoaded,
} from "../features/terminal/terminalSlice";
import { useGlobalShortcuts } from "../hooks/useGlobalShortcuts";
import { useAppDispatch, useAppSelector } from "../store/hooks";
function isRunBusy(status: string) {
  return ["preparing", "materializing", "building", "running"].includes(status);
}

export default function AppShellLayout() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const cloudProjectsStatus = useAppSelector(selectCloudProjectsStatus);
  const [isVisualSettingsOpen, setIsVisualSettingsOpen] = useState(false);

  useGlobalShortcuts();

  useEffect(() => {
    const unsubscribeTerminalData = window.electronAPI.onTerminalData((payload) => {
      appendTerminalConsoleChunk(payload);
    });
    const unsubscribeTerminalStatus = window.electronAPI.onTerminalStatus((payload) => {
      if (payload.type === "closed") {
        clearTerminalConsoleSession(payload.terminalId);
        dispatch(terminalSessionClosed({ terminalId: payload.terminalId }));
      }
    });
    const unsubscribeRunData = window.electronAPI.onRunData((payload) => {
      appendRunConsoleChunk(payload);
    });
    const unsubscribeRunSession = window.electronAPI.onRunSession((payload) => {
      dispatch(runSessionChanged(payload));

      if (isRunBusy(payload.status)) {
        dispatch(showBottomPanel("run"));
      }
    });

    void window.electronAPI
      .listTerminalSessions()
      .then((result) => {
        dispatch(
          terminalSessionsLoaded({
            terminals: result.terminals,
            activeTerminalId: result.activeTerminalId,
          }),
        );
      })
      .catch(() => undefined);

    void window.electronAPI
      .getCurrentRunSession()
      .then((result) => {
        if (!result.session) {
          return;
        }

        dispatch(runSessionChanged(result.session));

        if (isRunBusy(result.session.status)) {
          dispatch(showBottomPanel("run"));
        }
      })
      .catch(() => undefined);

    return () => {
      unsubscribeTerminalData();
      unsubscribeTerminalStatus();
      unsubscribeRunData();
      unsubscribeRunSession();
    };
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && cloudProjectsStatus === "idle") {
      void dispatch(fetchProjects());
    }
  }, [cloudProjectsStatus, dispatch, isAuthenticated]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-app text-primary">
      <TopBar onOpenVisualSettings={() => setIsVisualSettingsOpen(true)} />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <VisualSettingsDialog
        isOpen={isVisualSettingsOpen}
        onClose={() => setIsVisualSettingsOpen(false)}
      />
    </div>
  );
}
