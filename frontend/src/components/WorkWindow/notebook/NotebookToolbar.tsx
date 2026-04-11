import { VscAdd, VscMarkdown } from "react-icons/vsc";
import NotebookKernelControls from "./ui/NotebookKernelControls";

type NotebookToolbarProps = {
  cellCount: number;
  isDirty: boolean;
  isBlocked: boolean;
  readOnly?: boolean;
  statusMessage: string | null;
  execution: {
    kernels: NotebookKernelDescriptor[];
    kernelsLoading: boolean;
    kernelsError: string | null;
    selectedKernelId: string | null;
    sessionStatus: NotebookSessionStatus;
    sessionDetail: string | null;
    canExecute: boolean;
    isRunningAnyCell: boolean;
    onRefreshKernels: () => void;
    onSelectKernel: (kernelId: string) => void;
    onRunAll: () => void;
    onInterruptKernel: () => void;
    onRestartKernel: () => void;
  };
  onAddCodeCell: () => void;
  onAddMarkdownCell: () => void;
};

export default function NotebookToolbar({
  cellCount,
  isDirty,
  isBlocked,
  readOnly = false,
  statusMessage,
  execution,
  onAddCodeCell,
  onAddMarkdownCell,
}: NotebookToolbarProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-default bg-panel/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-primary">Редактор ноутбука</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-control h-9 px-3"
            onClick={onAddCodeCell}
            disabled={isBlocked || readOnly}
          >
            <VscAdd className="h-4 w-4" />
            <span>Код</span>
          </button>

          <button
            type="button"
            className="ui-control h-9 px-3"
            onClick={onAddMarkdownCell}
            disabled={isBlocked || readOnly}
          >
            <VscMarkdown className="h-4 w-4" />
            <span>Markdown</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-secondary">
        <span>{`${cellCount} ячеек`}</span>
        <span>
          {readOnly
            ? "Режим только чтения"
            : isDirty
              ? "Есть несохранённые изменения"
              : "Все изменения сохранены"}
        </span>
      </div>

      <div className="mt-2 min-h-[18px] text-xs text-secondary">
        {statusMessage ? <span>{statusMessage}</span> : <span className="invisible">status</span>}
      </div>

      <div className="mt-3">
        <NotebookKernelControls
          kernels={execution.kernels}
          kernelsLoading={execution.kernelsLoading}
          kernelsError={execution.kernelsError}
          selectedKernelId={execution.selectedKernelId}
          sessionStatus={execution.sessionStatus}
          sessionDetail={execution.sessionDetail}
          canExecute={execution.canExecute}
          isRunningAnyCell={execution.isRunningAnyCell}
          readOnly={readOnly}
          onRefresh={execution.onRefreshKernels}
          onSelectKernel={execution.onSelectKernel}
          onRunAll={execution.onRunAll}
          onInterrupt={execution.onInterruptKernel}
          onRestart={execution.onRestartKernel}
        />
      </div>
    </div>
  );
}
