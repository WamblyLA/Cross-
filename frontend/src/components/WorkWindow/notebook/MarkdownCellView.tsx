import type * as Monaco from "monaco-editor";
import { useEffect, useRef } from "react";
import { VscChevronDown, VscChevronUp, VscEdit, VscEye, VscTrash } from "react-icons/vsc";
import { type ThemeName } from "../../../styles/tokens";
import MarkdownRenderer from "../markdown/MarkdownRenderer";
import CellEditor from "./CellEditor";
import type { NotebookCellModel } from "./types";

type MarkdownCellViewProps = {
  cell: NotebookCellModel;
  index: number;
  filePath: string;
  theme: ThemeName;
  beforeMount: (monaco: typeof Monaco) => void;
  isSelected: boolean;
  focusToken: number;
  onSelect: (localId: string) => void;
  onChangeSource: (localId: string, source: string) => void;
  onChangeMode: (localId: string, mode: "edit" | "preview") => void;
  onPreviewCell: (localId: string) => void;
  onPreviewCellAndAdvance: (localId: string) => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onDelete: (localId: string) => void;
  onSaveRequest: () => Promise<void>;
};

export default function MarkdownCellView({
  cell,
  index,
  filePath,
  theme,
  beforeMount,
  isSelected,
  focusToken,
  onSelect,
  onChangeSource,
  onChangeMode,
  onPreviewCell,
  onPreviewCellAndAdvance,
  onMove,
  onDelete,
  onSaveRequest,
}: MarkdownCellViewProps) {
  const isPreview = cell.mode === "preview";
  const previewRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isPreview || !focusToken) {
      return;
    }

    previewRef.current?.focus();
  }, [focusToken, isPreview]);

  return (
    <section
      ref={previewRef}
      tabIndex={isPreview ? 0 : -1}
      className={`overflow-hidden rounded-[18px] border bg-panel shadow-sm transition-colors ${
        isSelected ? "border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/30" : "border-default"
      }`}
      onMouseDown={() => onSelect(cell.localId)}
      onFocus={() => onSelect(cell.localId)}
      onKeyDown={(event) => {
        if (!isPreview) {
          return;
        }

        if (event.key !== "Enter") {
          return;
        }

        if (!(event.ctrlKey || event.metaKey || event.shiftKey)) {
          return;
        }

        event.preventDefault();

        if (event.shiftKey) {
          onPreviewCellAndAdvance(cell.localId);
          return;
        }

        onPreviewCell(cell.localId);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm text-primary">{`Markdown-ячейка ${index + 1}`}</div>
          <div className="text-xs text-muted">
            Редактируйте содержимое или переключайтесь в режим предпросмотра
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`ui-control h-8 px-3 ${!isPreview ? "border-default bg-editor text-primary" : ""}`}
            onClick={() => onChangeMode(cell.localId, "edit")}
          >
            <VscEdit className="h-4 w-4" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            className={`ui-control h-8 px-3 ${isPreview ? "border-default bg-editor text-primary" : ""}`}
            onClick={() => onChangeMode(cell.localId, "preview")}
          >
            <VscEye className="h-4 w-4" />
            <span>Preview</span>
          </button>

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
        {isPreview ? (
          <MarkdownRenderer
            source={cell.source}
            filePath={filePath}
            className="rounded-[16px] border border-default bg-input px-5 py-5"
          />
        ) : (
          <CellEditor
            editorPath={`${filePath}#${cell.localId}`}
            language="markdown"
            value={cell.source}
            theme={theme}
            beforeMount={beforeMount}
            onChange={(nextValue) => onChangeSource(cell.localId, nextValue)}
            onSaveRequest={onSaveRequest}
            onRunRequest={() => onPreviewCell(cell.localId)}
            onRunAndAdvanceRequest={() => onPreviewCellAndAdvance(cell.localId)}
            onFocusRequest={() => onSelect(cell.localId)}
            focusToken={focusToken}
            lineNumbers="off"
            minHeight={120}
            tabSize={2}
          />
        )}
      </div>
    </section>
  );
}
