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
      return "border-default bg-editor text-primary";
    default:
      return "border-default bg-input text-secondary";
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
    <div className="flex flex-wrap items-center gap-2">
      <div ref={rootRef} className="relative min-w-[320px]">
        <button
          type="button"
          className="ui-control h-auto min-h-9 w-full justify-between px-3 py-2 text-left"
          onClick={() => setIsSelectorOpen((current) => !current)}
          disabled={kernelsLoading}
          title="Выбор ядра Jupyter"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-primary">
              {selectedKernel?.primaryLabel ?? "Выберите ядро"}
            </div>
            <div className="truncate text-xs text-secondary">
              {selectedKernel?.secondaryLabel ??
                (kernelsLoading
                  ? "Загружаем доступные ядра..."
                  : "Ноутбук останется редактируемым, пока ядро не выбрано.")}
            </div>
          </div>
          <VscChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isSelectorOpen ? "rotate-180" : ""}`} />
        </button>

        {isSelectorOpen ? (
          <div className="ui-menu ui-scrollbar-thin absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-80 overflow-y-auto rounded-[16px] p-2">
            {kernels.length === 0 ? (
              <div className="px-3 py-2 text-sm text-secondary">
                {kernelsLoading
                  ? "Загрузка ядер..."
                  : "Jupyter-ядра не найдены."}
              </div>
            ) : (
              kernels.map((kernel) => {
                const isActive = selectedKernelId === kernel.id;

                return (
                  <button
                    key={kernel.id}
                    type="button"
                    className={`flex w-full items-start justify-between rounded-[12px] px-3 py-2 text-left transition-colors ${
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
        className="ui-control h-9 w-9"
        onClick={onRefresh}
        title="Обновить список ядер"
      >
        <VscRefresh className={`h-4 w-4 ${kernelsLoading ? "animate-spin" : ""}`} />
      </button>

      <div
        className={`ui-pill border px-3 py-2 text-xs ${renderStatusClass(sessionStatus)}`}
        title={sessionDetail ?? renderStatusLabel(sessionStatus)}
      >
        {renderStatusLabel(sessionStatus)}
      </div>

      <button
        type="button"
        className="ui-control h-9 px-3"
        onClick={onRunAll}
        disabled={!canExecute || isRunningAnyCell}
        title="Выполнить весь ноутбук"
      >
        <VscRunAll className="h-4 w-4" />
        <span>Выполнить всё</span>
      </button>

      <button
        type="button"
        className="ui-control h-9 px-3"
        onClick={onInterrupt}
        disabled={!isRunningAnyCell}
        title="Прервать выполнение"
      >
        <VscDebugPause className="h-4 w-4" />
        <span>Прервать</span>
      </button>

      <button
        type="button"
        className="ui-control h-9 px-3"
        onClick={onRestart}
        disabled={!selectedKernelId || isRunningAnyCell}
        title="Перезапустить ядро"
      >
        <VscDebugRestart className="h-4 w-4" />
        <span>Перезапустить</span>
      </button>

      {kernelsError ? (
        <span className="text-xs text-error">{kernelsError}</span>
      ) : sessionDetail ? (
        <span className="text-xs text-secondary">{sessionDetail}</span>
      ) : null}
    </div>
  );
}
