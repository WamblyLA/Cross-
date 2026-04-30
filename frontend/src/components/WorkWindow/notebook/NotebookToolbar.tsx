import { VscAdd, VscMarkdown } from "react-icons/vsc";
import NotebookKernelControls from "./ui/NotebookKernelControls";

type NotebookToolbarProps = {
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
  isBlocked,
  readOnly = false,
  statusMessage,
  execution,
  onAddCodeCell,
  onAddMarkdownCell,
}: NotebookToolbarProps) {
  const toolbarMessage = readOnly
    ? statusMessage
      ? `${statusMessage} - Только чтение`
      : "Только чтение"
    : statusMessage;

  return (
    <div className="sticky top-0 z-10 border-b border-default bg-chrome/95 px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="ui-control h-8 rounded-md border border-default bg-panel px-3 text-xs text-primary"
            onClick={onAddCodeCell}
            disabled={isBlocked || readOnly}
            title="Добавить code cell"
          >
            <VscAdd className="h-4 w-4" />
            <span>Code</span>
          </button>

          <button
            type="button"
            className="ui-control h-8 rounded-md border border-default bg-panel px-3 text-xs text-primary"
            onClick={onAddMarkdownCell}
            disabled={isBlocked || readOnly}
            title="Добавить markdown cell"
          >
            <VscMarkdown className="h-4 w-4" />
            <span>Markdown</span>
          </button>
        </div>

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

      {toolbarMessage ? (
        <div className="mt-2 truncate px-1 text-xs text-secondary">{toolbarMessage}</div>
      ) : null}
    </div>
  );
}
