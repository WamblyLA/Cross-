import type * as Monaco from "monaco-editor";
import { VscAdd, VscChevronDown, VscChevronUp, VscTrash } from "react-icons/vsc";
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
  beforeMount: (monaco: typeof Monaco) => void;
  onChangeSource: (localId: string, source: string) => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onDelete: (localId: string) => void;
  onAddBelow: (cellType: "code" | "markdown", afterIndex: number) => void;
  onSaveRequest: () => Promise<void>;
};

export default function CodeCellView({
  cell,
  index,
  editorLanguage,
  filePath,
  theme,
  beforeMount,
  onChangeSource,
  onMove,
  onDelete,
  onAddBelow,
  onSaveRequest,
}: CodeCellViewProps) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-default bg-panel shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm text-primary">Ячейка кода {index + 1}</div>
          <div className="text-xs text-muted">
            {cell.executionCount != null
              ? `Сохранённый счётчик выполнения: ${cell.executionCount}`
              : "Только редактирование. Выполнение не входит в эту задачу."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => onMove(cell.localId, -1)}
            title="Переместить вверх"
          >
            <VscChevronUp className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => onMove(cell.localId, 1)}
            title="Переместить вниз"
          >
            <VscChevronDown className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => onDelete(cell.localId)}
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
          beforeMount={beforeMount}
          onChange={(nextValue) => onChangeSource(cell.localId, nextValue)}
          onSaveRequest={onSaveRequest}
          lineNumbers="on"
          minHeight={160}
          tabSize={4}
        />

        <div className="mt-4">
          <OutputRenderer
            outputs={cell.outputs}
            hasUnsupportedOutputs={cell.hasUnsupportedOutputs}
            filePath={filePath}
            theme={theme}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-control h-8 px-3"
            onClick={() => onAddBelow("code", index)}
          >
            <VscAdd className="h-4 w-4" />
            <span>Добавить ячейку кода ниже</span>
          </button>

          <button
            type="button"
            className="ui-control h-8 px-3"
            onClick={() => onAddBelow("markdown", index)}
          >
            <VscAdd className="h-4 w-4" />
            <span>Добавить Markdown-ячейку ниже</span>
          </button>
        </div>
      </div>
    </section>
  );
}
