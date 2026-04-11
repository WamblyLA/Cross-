import type * as Monaco from "monaco-editor";
import { VscChevronDown, VscChevronUp, VscPlay, VscTrash } from "react-icons/vsc";
import { type ThemeName } from "../../../styles/tokens";
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
  executionState: {
    isRunning: boolean;
    lastStatus: NotebookExecutionStatus | null;
  };
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

function renderStatusText(
  cell: NotebookCellModel,
  executionState: CodeCellViewProps["executionState"],
) {
  if (executionState.isRunning) {
    return "Ячейка выполняется...";
  }

  if (executionState.lastStatus === "error") {
    return "Последний запуск завершился с ошибкой";
  }

  if (executionState.lastStatus === "interrupted") {
    return "Последний запуск был прерван";
  }

  if (cell.executionCount != null) {
    return `Счётчик выполнения: ${cell.executionCount}`;
  }

  return "Ядро ещё не запускало эту ячейку.";
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
  return (
    <section
      className={`overflow-hidden rounded-[18px] border bg-panel shadow-sm transition-colors ${
        isSelected ? "border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/30" : "border-default"
      }`}
      onMouseDown={() => onSelect(cell.localId)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm text-primary">{`Ячейка кода ${index + 1}`}</div>
          <div className="text-xs text-muted">{renderStatusText(cell, executionState)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-control h-8 px-3"
            onClick={() => {
              onSelect(cell.localId);
              onRunCell(cell.localId);
            }}
            disabled={readOnly || !canExecute || executionState.isRunning}
            title="Запустить ячейку"
          >
            <VscPlay className="h-4 w-4" />
            <span>Запустить ячейку</span>
          </button>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => onMove(cell.localId, -1)}
            disabled={readOnly}
            title="Переместить вверх"
          >
            <VscChevronUp className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => onMove(cell.localId, 1)}
            disabled={readOnly}
            title="Переместить вниз"
          >
            <VscChevronDown className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => onDelete(cell.localId)}
            disabled={readOnly}
            title="Удалить ячейку"
          >
            <VscTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
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
          minHeight={160}
          tabSize={tabSize}
          readOnly={readOnly}
        />

        <div className="mt-4">
          <OutputRenderer
            outputs={cell.outputs}
            hasUnsupportedOutputs={cell.hasUnsupportedOutputs}
            filePath={filePath}
            theme={theme}
          />
        </div>
      </div>
    </section>
  );
}
