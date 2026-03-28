import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "../components/TopBar/TopBar";
import {
  terminalClosed,
  terminalRunFinished,
  terminalRunStarted,
} from "../features/runner/runnerSlice";
import { useGlobalShortcuts } from "../hooks/useGlobalShortcuts";
import { useAppDispatch } from "../store/hooks";
import type { ThemeName } from "../styles/tokens";

type AppShellLayoutProps = {
  theme: ThemeName;
  onToggleTheme: () => void;
};

export default function AppShellLayout({ theme, onToggleTheme }: AppShellLayoutProps) {
  const dispatch = useAppDispatch();

  useGlobalShortcuts();

  useEffect(() => {
    const unsubscribeStatus = window.electronAPI.onTerminalStatus((payload) => {
      if (payload.type === "closed") {
        dispatch(terminalClosed());
        return;
      }

      if (payload.type === "run-started") {
        dispatch(
          terminalRunStarted({
            filePath: payload.filePath,
            interpreter: payload.interpreter,
          }),
        );
        return;
      }

      if (payload.type === "run-finished") {
        dispatch(
          terminalRunFinished({
            exitCode: payload.exitCode,
          }),
        );
      }
    });

    return () => {
      unsubscribeStatus();
    };
  }, [dispatch]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-app text-primary">
      <TopBar theme={theme} onToggleTheme={onToggleTheme} />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
