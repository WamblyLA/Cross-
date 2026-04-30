import type * as Monaco from "monaco-editor";
import { useEffect, useState } from "react";
import { VscChevronDown, VscChevronUp, VscPlay, VscTrash } from "react-icons/vsc";
import { type ThemeName } from "../../../styles/tokens";
import type { NotebookCellExecutionState } from "./execution/types";
import CellEditor from "./CellEditor";
import OutputRenderer from "./OutputRenderer";
import type { NotebookCellModel } from "./types";

type CodeCellViewProps = {
  cell: NotebookCellModel;
  index: number;
  editorLanguage: string;
  filePath: string;
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
  beforeMount: (monaco: typeof Monaco) => void;
  executionState: NotebookCellExecutionState;
  canExecute: boolean;
  readOnly?: boolean;
  isSelected: boolean;
  focusToken: number;
  onSelect: (localId: string) => void;
  onRunCell: (localId: string) => void;
  onRunCellAndAdvance: (localId: string) => void;
  onChangeSource: (localId: string, source: string) => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onDelete: (localId: string) => void;
  onSaveRequest: () => Promise<void>;
};

function formatExecutionDuration(durationMs: number) {
  if (durationMs < 1_000) {
    return `${Math.max(1, Math.round(durationMs))} ms`;
  }

  if (durationMs < 60_000) {
    return `${(durationMs / 1_000).toFixed(durationMs < 10_000 ? 1 : 0)} s`;
  }

  const totalSeconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function getExecutionMeta(executionState: NotebookCellExecutionState, nowMs: number) {
  const durationMs =
    executionState.isRunning && executionState.startedAtMs != null
      ? Math.max(0, nowMs - executionState.startedAtMs)
      : executionState.lastDurationMs;
  const durationLabel = durationMs != null ? formatExecutionDuration(durationMs) : null;

  if (executionState.isRunning) {
    return {
      label: durationLabel ? `Выполняется ${durationLabel}` : "Выполняется",
      gutterLabel: durationLabel,
      toneClass: "text-[color:var(--warning)]",
    };
  }

  if (executionState.lastStatus === "error") {
    return {
      label: durationLabel ? `Ошибка, ${durationLabel}` : "Ошибка",
      gutterLabel: durationLabel,
      toneClass: "text-error",
    };
  }

  if (executionState.lastStatus === "interrupted") {
    return {
      label: durationLabel ? `Прервано, ${durationLabel}` : "Прервано",
      gutterLabel: durationLabel,
      toneClass: "text-secondary",
    };
  }

  return {
    label: durationLabel,
    gutterLabel: durationLabel,
    toneClass: "text-secondary",
  };
}

export default function CodeCellView({
  cell,
  index,
  editorLanguage,
  filePath,
  theme,
  fontSize,
  tabSize,
  beforeMount,
  executionState,
  canExecute,
  readOnly = false,
  isSelected,
  focusToken,
  onSelect,
  onRunCell,
  onRunCellAndAdvance,
  onChangeSource,
  onMove,
  onDelete,
  onSaveRequest,
}: CodeCellViewProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const executionMeta = getExecutionMeta(executionState, nowMs);
  const hasOutputs = cell.outputs.length > 0 || cell.hasUnsupportedOutputs;

  useEffect(() => {
    if (!executionState.isRunning) {
      return;
    }

    setNowMs(Date.now());
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);

    return () => {
      window.clearInterval(timerId);
    };
  }, [executionState.isRunning]);

  return (
    <section
      className={`overflow-hidden rounded-[10px] border bg-panel transition-colors ${
        isSelected
          ? "border-[color:var(--accent)] shadow-[inset_2px_0_0_0_var(--accent)]"
          : "border-default"
      }`}
      onMouseDown={() => onSelect(cell.localId)}
    >
      <div className="grid grid-cols-[52px_minmax(0,1fr)]">
        <div
          className={`flex min-h-full flex-col items-center gap-2 border-r px-2 py-3 ${
            isSelected ? "border-[color:var(--accent)] bg-editor" : "border-default bg-panel"
          }`}
        >
          <button
            type="button"
            className="ui-control h-8 w-8 rounded-md border border-default bg-editor text-primary"
            onClick={() => {
              onSelect(cell.localId);
              onRunCell(cell.localId);
            }}
            disabled={readOnly || !canExecute || executionState.isRunning}
            title="Запустить ячейку"
          >
            <VscPlay className={`h-4 w-4 ${executionState.isRunning ? "animate-pulse" : ""}`} />
          </button>

          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            {index + 1}
          </div>

          <div
            className={`min-h-[12px] text-center text-[10px] leading-3 ${
              executionMeta.gutterLabel ? executionMeta.toneClass : "text-muted"
            }`}
          >
            {executionMeta.gutterLabel ?? ""}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b border-default px-3">
            <div className="min-w-0">
              <div className="ui-micro-label">Code</div>
              {executionMeta.label ? (
                <div className={`truncate text-xs ${executionMeta.toneClass}`}>
                  {executionMeta.label}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="ui-control h-7 w-7 rounded-md"
                onClick={() => onMove(cell.localId, -1)}
                disabled={readOnly}
                title="Переместить вверх"
              >
                <VscChevronUp className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="ui-control h-7 w-7 rounded-md"
                onClick={() => onMove(cell.localId, 1)}
                disabled={readOnly}
                title="Переместить вниз"
              >
                <VscChevronDown className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="ui-control h-7 w-7 rounded-md"
                onClick={() => onDelete(cell.localId)}
                disabled={readOnly}
                title="Удалить ячейку"
              >
                <VscTrash className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-editor">
            <CellEditor
              editorPath={`${filePath}#${cell.localId}`}
              language={editorLanguage}
              value={cell.source}
              theme={theme}
              fontSize={fontSize}
              beforeMount={beforeMount}
              onChange={(nextValue) => onChangeSource(cell.localId, nextValue)}
              onSaveRequest={onSaveRequest}
              onRunRequest={() => onRunCell(cell.localId)}
              onRunAndAdvanceRequest={() => onRunCellAndAdvance(cell.localId)}
              onFocusRequest={() => onSelect(cell.localId)}
              focusToken={focusToken}
              lineNumbers="on"
              minHeight={96}
              tabSize={tabSize}
              readOnly={readOnly}
            />
          </div>

          {hasOutputs ? (
            <div className="border-t border-default bg-panel px-3 py-2">
              <OutputRenderer
                cellLocalId={cell.localId}
                outputs={cell.outputs}
                hasUnsupportedOutputs={cell.hasUnsupportedOutputs}
                filePath={filePath}
                theme={theme}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
