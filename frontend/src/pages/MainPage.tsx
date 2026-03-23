import { useEffect } from "react";
import Console from "../components/Console";
import SideBar from "../components/SideBar/SideBar";
import TopBar from "../components/TopBar/TopBar";
import WorkWindow from "../components/WorkWindow/WorkWindow";
import { useGlobalShortcuts } from "../hooks/useGlobalShortcuts";
import {
  terminalClosed,
  terminalRunFinished,
  terminalRunStarted,
} from "../features/runner/runnerSlice";
import type { ThemeName } from "../styles/tokens";
import { useAppDispatch } from "../store/hooks";

type MainPageProps = {
  theme: ThemeName;
  onToggleTheme: () => void;
};

export default function MainPage({ theme, onToggleTheme }: MainPageProps) {
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

      dispatch(
        terminalRunFinished({
          exitCode: payload.exitCode,
        }),
      );
    });

    return () => {
      unsubscribeStatus();
    };
  }, [dispatch]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-app text-primary">
      <TopBar theme={theme} onToggleTheme={onToggleTheme} />

      <div className="flex min-h-0 flex-1">
        <SideBar />

        <div className="flex min-w-0 flex-1 flex-col bg-editor">
          <WorkWindow theme={theme} />
          <Console theme={theme} />
        </div>
      </div>
    </div>
  );
}
