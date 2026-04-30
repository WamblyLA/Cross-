import { VscChromeClose, VscDebugRestart, VscStopCircle } from "react-icons/vsc";
import type { RunSession } from "../../features/run/runTypes";

type RunSessionHeaderProps = {
  session: RunSession;
  onStop: () => Promise<unknown> | void;
  onRerun: () => Promise<unknown> | void;
  onHide: () => void;
};

function getStatusTone(status: RunSession["status"]) {
  switch (status) {
    case "failed":
      return "text-error";
    case "finished":
      return "text-secondary";
    case "interrupted":
    case "cancelled":
      return "text-muted";
    default:
      return "text-primary";
  }
}

export default function RunSessionHeader({
  session,
  onStop,
  onRerun,
  onHide,
}: RunSessionHeaderProps) {
  const canStop = ["preparing", "materializing", "building", "running"].includes(session.status);

  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b border-default px-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-primary">{session.configurationName}</span>
          <span className={`text-xs ${getStatusTone(session.status)}`}>{session.statusText}</span>
        </div>
        <div className="truncate text-xs text-secondary">
          {session.targetPath ?? "Цель запуска ещё подготавливается"}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {session.runtimeLabel ? (
          <span className="ui-pill ui-pill-muted">{session.runtimeLabel}</span>
        ) : null}
        {session.exitCode !== null ? (
          <span className="ui-pill ui-pill-secondary">Код: {session.exitCode}</span>
        ) : null}
        <button
          type="button"
          className="ui-control h-8 w-8"
          disabled={!canStop}
          onClick={() => {
            void onStop();
          }}
          title="Остановить"
        >
          <VscStopCircle />
        </button>
        <button
          type="button"
          className="ui-control h-8 w-8"
          disabled={!session.canRerun || canStop}
          onClick={() => {
            void onRerun();
          }}
          title="Перезапустить"
        >
          <VscDebugRestart />
        </button>
        <button
          type="button"
          className="ui-control h-8 w-8"
          onClick={onHide}
          title="Скрыть нижнюю панель"
        >
          <VscChromeClose />
        </button>
      </div>
    </div>
  );
}
