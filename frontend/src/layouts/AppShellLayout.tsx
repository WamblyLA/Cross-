import ProjectMembersDialog from "../components/CodeWithMe/ProjectMembersDialog";
import {
  ProjectMembersDialogProvider,
} from "../components/CodeWithMe/ProjectMembersDialogContext";
import { useProjectMembersDialog } from "../components/CodeWithMe/useProjectMembersDialog";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import VisualSettingsDialog from "../components/settings/VisualSettingsDialog";
import TopBar from "../components/TopBar/TopBar";
import { selectIsAuthenticated } from "../features/auth/authSelectors";
import { selectCloudProjectsStatus } from "../features/cloud/cloudSelectors";
import { fetchProjects } from "../features/cloud/cloudThunks";
import { selectNotificationsStatus } from "../features/notifications/notificationsSelectors";
import { fetchNotifications } from "../features/notifications/notificationsThunks";
import { showBottomPanel } from "../features/panel/panelSlice";
import { appendRunConsoleChunk } from "../features/run/runConsoleStore";
import { runSessionChanged } from "../features/run/runSlice";
import {
  appendTerminalConsoleChunk,
  clearTerminalConsoleSession,
} from "../features/terminal/terminalConsoleStore";
import {
  terminalSessionClosed,
  terminalProfilesLoaded,
  terminalSessionsLoaded,
} from "../features/terminal/terminalSlice";
import { useGlobalShortcuts } from "../hooks/useGlobalShortcuts";
import { useLinkedWorkspaceBootstrap } from "../hooks/useLinkedWorkspaceBootstrap";
import { useAppDispatch, useAppSelector } from "../store/hooks";

function isRunBusy(status: string) {
  return ["preparing", "materializing", "building", "running"].includes(status);
}

export default function AppShellLayout() {
  return (
    <ProjectMembersDialogProvider>
      <AppShellLayoutContent />
    </ProjectMembersDialogProvider>
  );
}

function AppShellLayoutContent() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const cloudProjectsStatus = useAppSelector(selectCloudProjectsStatus);
  const notificationsStatus = useAppSelector(selectNotificationsStatus);
  const [isVisualSettingsOpen, setIsVisualSettingsOpen] = useState(false);
  const { closeProjectMembers, isOpen, openProjectMembers, projectId } = useProjectMembersDialog();

  useGlobalShortcuts();
  useLinkedWorkspaceBootstrap();

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
    const unsubscribeTerminalProfiles = window.electronAPI.onTerminalProfilesUpdated((payload) => {
      dispatch(terminalProfilesLoaded(payload));
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
      .listTerminalProfiles()
      .then((result) => {
        dispatch(terminalProfilesLoaded(result));
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
      unsubscribeTerminalProfiles();
      unsubscribeRunData();
      unsubscribeRunSession();
    };
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && cloudProjectsStatus === "idle") {
      void dispatch(fetchProjects());
    }
  }, [cloudProjectsStatus, dispatch, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && notificationsStatus === "idle") {
      void dispatch(fetchNotifications());
    }
  }, [dispatch, isAuthenticated, notificationsStatus]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-app text-primary">
      <TopBar
        onOpenProjectMembers={() => openProjectMembers(projectId)}
        onOpenVisualSettings={() => setIsVisualSettingsOpen(true)}
      />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <ProjectMembersDialog
        isOpen={isOpen}
        projectId={projectId}
        onClose={closeProjectMembers}
      />
      <VisualSettingsDialog
        isOpen={isVisualSettingsOpen}
        onClose={() => setIsVisualSettingsOpen(false)}
      />
    </div>
  );
}
