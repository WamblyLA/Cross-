import { useMemo } from "react";
import { hideBottomPanel } from "../../features/panel/panelSlice";
import {
  selectRunCurrentSession,
  selectRunErrorMessage,
  selectSelectedRunConfiguration,
} from "../../features/run/runSelectors";
import { useRunActions } from "../../hooks/useRunActions";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { ThemeName } from "../../styles/tokens";
import RunConsole from "./RunConsole";
import RunConsoleBoundary from "./RunConsoleBoundary";
import RunSessionHeader from "./RunSessionHeader";

type RunPanelProps = {
  theme: ThemeName;
};

export default function RunPanel({ theme }: RunPanelProps) {
  const dispatch = useAppDispatch();
  const currentSession = useAppSelector(selectRunCurrentSession);
  const selectedConfiguration = useAppSelector(selectSelectedRunConfiguration);
  const errorMessage = useAppSelector(selectRunErrorMessage);
  const isActive = useAppSelector(
    (state) => state.panel.isVisible && state.panel.activeTab === "run",
  );
  const { openRunConfigurationDialog, rerun, runSelectedConfiguration, stopRun } = useRunActions();

  const helperText = useMemo(() => {
    if (currentSession) {
      return null;
    }

    if (selectedConfiguration) {
      return `Активная конфигурация: ${selectedConfiguration.name}`;
    }

    return "Выберите конфигурацию запуска";
  }, [currentSession, selectedConfiguration]);

  const shouldShowInlineError = Boolean(errorMessage && !currentSession);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {currentSession ? (
        <RunSessionHeader
          session={currentSession}
          onHide={() => dispatch(hideBottomPanel())}
          onRerun={rerun}
          onStop={stopRun}
        />
      ) : (
        <div className="flex h-14 items-center justify-between gap-3 border-b border-default px-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Запуск</div>
            <div className="text-sm text-secondary">{helperText}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ui-control px-3 py-2"
              onClick={() => {
                void openRunConfigurationDialog();
              }}
            >
              Конфигурации
            </button>
            <button
              type="button"
              className="ui-button-primary ui-control px-4 py-2"
              onClick={() => {
                void runSelectedConfiguration();
              }}
            >
              Запустить
            </button>
          </div>
        </div>
      )}

      {shouldShowInlineError ? (
        <div className="border-b border-default bg-[rgba(196,85,85,0.08)] px-3 py-2 text-sm text-error">
          {errorMessage}
        </div>
      ) : null}

      {currentSession ? (
        <RunConsoleBoundary sessionId={currentSession.id}>
          <RunConsole
            theme={theme}
            session={currentSession}
            isActive={isActive}
            onStop={stopRun}
          />
        </RunConsoleBoundary>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6">
          <div className="max-w-lg rounded-2xl border border-default bg-editor px-6 py-8 text-center shadow-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-muted">Run Console</div>
            <h2 className="mt-3 text-xl text-primary">Подсистема запуска готова</h2>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Выберите конфигурацию и запустите текущий файл или Python-проект
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
