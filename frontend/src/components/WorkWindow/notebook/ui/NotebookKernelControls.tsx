import { useEffect, useMemo, useRef, useState } from "react";
import {
  VscCheck,
  VscChevronDown,
  VscDebugPause,
  VscDebugRestart,
  VscRefresh,
  VscRunAll,
} from "react-icons/vsc";

type NotebookKernelControlsProps = {
  kernels: NotebookKernelDescriptor[];
  kernelsLoading: boolean;
  kernelsError: string | null;
  selectedKernelId: string | null;
  sessionStatus: NotebookSessionStatus;
  sessionDetail: string | null;
  canExecute: boolean;
  isRunningAnyCell: boolean;
  readOnly?: boolean;
  onRefresh: () => void;
  onSelectKernel: (kernelId: string) => void;
  onRunAll: () => void;
  onInterrupt: () => void;
  onRestart: () => void;
};

function renderStatusLabel(status: NotebookSessionStatus) {
  switch (status) {
    case "starting":
      return "Запуск";
    case "busy":
      return "Занято";
    case "interrupting":
      return "Прерывание";
    case "restarting":
      return "Перезапуск";
    case "failed":
      return "Ошибка";
    case "dead":
      return "Остановлено";
    case "disconnected":
      return "Отключено";
    case "idle":
      return "Готово";
    default:
      return "Без ядра";
  }
}

function renderStatusClass(status: NotebookSessionStatus) {
  switch (status) {
    case "busy":
    case "starting":
    case "interrupting":
    case "restarting":
      return "border-[color:var(--warning)] bg-[rgba(210,161,91,0.12)] text-primary";
    case "failed":
    case "dead":
    case "disconnected":
      return "border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] text-error";
    case "idle":
      return "border-default bg-panel text-primary";
    default:
      return "border-default bg-editor text-secondary";
  }
}

export default function NotebookKernelControls({
  kernels,
  kernelsLoading,
  kernelsError,
  selectedKernelId,
  sessionStatus,
  sessionDetail,
  canExecute,
  isRunningAnyCell,
  readOnly = false,
  onRefresh,
  onSelectKernel,
  onRunAll,
  onInterrupt,
  onRestart,
}: NotebookKernelControlsProps) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedKernel = useMemo(
    () => kernels.find((kernel) => kernel.id === selectedKernelId) ?? null,
    [kernels, selectedKernelId],
  );

  useEffect(() => {
    if (!isSelectorOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isSelectorOpen]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <div ref={rootRef} className="relative min-w-[220px] max-w-[360px] flex-1">
        <button
          type="button"
          className="ui-control h-8 w-full justify-between rounded-md border border-default bg-panel px-3 text-left"
          onClick={() => setIsSelectorOpen((current) => !current)}
          disabled={kernelsLoading || readOnly}
          title={selectedKernel?.secondaryLabel ?? "Выбор Jupyter-ядра"}
        >
          <span className="min-w-0 truncate text-xs text-primary">
            {selectedKernel?.primaryLabel ??
              (kernelsLoading ? "Загрузка ядер..." : "Выберите ядро")}
          </span>
          <VscChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${isSelectorOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isSelectorOpen ? (
          <div className="ui-menu ui-scrollbar-thin absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-[10px] p-1">
            {kernels.length === 0 ? (
              <div className="px-3 py-2 text-sm text-secondary">
                {kernelsLoading ? "Загрузка ядер..." : "Jupyter-ядра не найдены."}
              </div>
            ) : (
              kernels.map((kernel) => {
                const isActive = selectedKernelId === kernel.id;

                return (
                  <button
                    key={kernel.id}
                    type="button"
                    className={`flex w-full items-start justify-between rounded-[8px] px-3 py-2 text-left transition-colors ${
                      isActive ? "bg-editor text-primary" : "hover:bg-editor/80"
                    }`}
                    onClick={() => {
                      setIsSelectorOpen(false);
                      onSelectKernel(kernel.id);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-primary">{kernel.primaryLabel}</div>
                      <div className="truncate text-xs text-secondary">
                        {kernel.secondaryLabel ?? kernel.displayName}
                      </div>
                    </div>
                    {isActive ? <VscCheck className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="ui-control h-8 w-8 rounded-md border border-default bg-panel"
        onClick={onRefresh}
        disabled={readOnly}
        title="Обновить список ядер"
      >
        <VscRefresh className={`h-4 w-4 ${kernelsLoading ? "animate-spin" : ""}`} />
      </button>

      <div
        className={`inline-flex h-8 items-center rounded-md border px-2 text-[11px] ${renderStatusClass(sessionStatus)}`}
        title={kernelsError ?? sessionDetail ?? renderStatusLabel(sessionStatus)}
      >
        {renderStatusLabel(sessionStatus)}
      </div>

      <button
        type="button"
        className="ui-control h-8 w-8 rounded-md border border-default bg-panel"
        onClick={onRunAll}
        disabled={readOnly || !canExecute || isRunningAnyCell}
        title="Выполнить весь ноутбук"
      >
        <VscRunAll className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="ui-control h-8 w-8 rounded-md border border-default bg-panel"
        onClick={onInterrupt}
        disabled={readOnly || !isRunningAnyCell}
        title="Прервать выполнение"
      >
        <VscDebugPause className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="ui-control h-8 w-8 rounded-md border border-default bg-panel"
        onClick={onRestart}
        disabled={readOnly || !selectedKernelId || isRunningAnyCell}
        title="Перезапустить ядро"
      >
        <VscDebugRestart className="h-4 w-4" />
      </button>
    </div>
  );
}
