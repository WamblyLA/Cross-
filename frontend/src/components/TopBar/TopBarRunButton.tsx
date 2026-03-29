import { useEffect, useRef, useState } from "react";
import { VscChevronDown, VscDebugRestart, VscPlay, VscStopCircle } from "react-icons/vsc";
import {
  selectRunCurrentSession,
  selectSelectedRunConfiguration,
} from "../../features/run/runSelectors";
import { useRunActions } from "../../hooks/useRunActions";
import { useAppSelector } from "../../store/hooks";
import RunTargetPicker from "../Run/RunTargetPicker";

export default function TopBarRunButton() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const ensureConfigurationsLoadedRef = useRef<null | (() => Promise<unknown>)>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const selectedConfiguration = useAppSelector(selectSelectedRunConfiguration);
  const currentSession = useAppSelector(selectRunCurrentSession);
  const {
    ensureConfigurationsLoaded,
    rerun,
    runSelectedConfiguration,
    stopRun,
    workspaceCacheKey,
    workspaceDescriptor,
  } = useRunActions();
  const workspaceIdentity =
    workspaceDescriptor?.scope === "local"
      ? `local:${workspaceDescriptor.rootPath}:${workspaceDescriptor.activeFileExtension ?? ""}`
      : workspaceDescriptor
        ? `cloud:${workspaceDescriptor.projectId}:${workspaceDescriptor.activeFileExtension ?? ""}`
        : null;

  useEffect(() => {
    ensureConfigurationsLoadedRef.current = ensureConfigurationsLoaded;
  }, [ensureConfigurationsLoaded]);

  useEffect(() => {
    if (!workspaceIdentity || !workspaceCacheKey) {
      return;
    }

    void ensureConfigurationsLoadedRef.current?.();
  }, [workspaceCacheKey, workspaceIdentity]);

  const isBusy = Boolean(
    currentSession &&
      ["preparing", "materializing", "building", "running"].includes(currentSession.status),
  );
  const canRun = Boolean(isBusy || workspaceDescriptor);
  const secondaryLabel = selectedConfiguration?.name ?? "Выберите конфигурацию";

  return (
    <>
      <div className="flex h-8 min-w-[220px] max-w-[280px] items-stretch overflow-hidden rounded-[10px] border border-default bg-panel">
        <button
          type="button"
          className={`flex min-w-0 flex-1 items-center gap-2 px-3 text-left text-sm transition-colors ${
            canRun ? "text-primary hover:bg-hover" : "cursor-not-allowed text-muted"
          }`}
          disabled={!canRun}
          onClick={() => {
            if (isBusy) {
              void stopRun();
              return;
            }

            void runSelectedConfiguration();
          }}
          title={secondaryLabel}
        >
          {isBusy ? (
            <VscStopCircle className="h-4 w-4 shrink-0" />
          ) : (
            <VscPlay className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-[0.16em] text-muted">
              {isBusy ? "Остановить" : "Запуск"}
            </span>
            <span className="block truncate text-xs">{secondaryLabel}</span>
          </span>
        </button>

        <div className="flex shrink-0 border-l border-default">
          <button
            type="button"
            className="ui-control h-full rounded-none border-0 px-2"
            onClick={() => {
              void ensureConfigurationsLoaded().then(() => {
                setIsPickerOpen((current) => !current);
              });
            }}
            ref={buttonRef}
            title="Параметры запуска"
          >
            <VscChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ui-control h-full rounded-none border-0 px-2"
            disabled={!currentSession?.canRerun || isBusy}
            onClick={() => {
              void rerun();
            }}
            title="Перезапустить"
          >
            <VscDebugRestart className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isPickerOpen && buttonRef.current ? (
        <RunTargetPicker
          anchorRect={buttonRef.current.getBoundingClientRect()}
          onClose={() => setIsPickerOpen(false)}
          onRun={runSelectedConfiguration}
          onStop={stopRun}
          onRerun={rerun}
        />
      ) : null}
    </>
  );
}
