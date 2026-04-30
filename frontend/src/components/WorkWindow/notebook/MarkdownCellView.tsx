import type * as Monaco from "monaco-editor";
import { useEffect, useRef } from "react";
import {
  VscChevronDown,
  VscChevronUp,
  VscEdit,
  VscEye,
  VscMarkdown,
  VscTrash,
} from "react-icons/vsc";
import { type ThemeName } from "../../../styles/tokens";
import MarkdownRenderer from "../markdown/MarkdownRenderer";
import CellEditor from "./CellEditor";
import type { NotebookCellModel } from "./types";

type MarkdownCellViewProps = {
  cell: NotebookCellModel;
  index: number;
  filePath: string;
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
  beforeMount: (monaco: typeof Monaco) => void;
  readOnly?: boolean;
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
  fontSize,
  tabSize,
  beforeMount,
  readOnly = false,
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
      className={`overflow-hidden rounded-[10px] border bg-panel transition-colors ${
        isSelected
          ? "border-[color:var(--accent)] shadow-[inset_2px_0_0_0_var(--accent)]"
          : "border-default"
      }`}
      onMouseDown={() => onSelect(cell.localId)}
      onFocus={() => onSelect(cell.localId)}
      onKeyDown={(event) => {
        if (!isPreview || event.key !== "Enter") {
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
      <div className="grid grid-cols-[52px_minmax(0,1fr)]">
        <div
          className={`flex min-h-full flex-col items-center gap-2 border-r px-2 py-3 ${
            isSelected ? "border-[color:var(--accent)] bg-editor" : "border-default bg-panel"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-default bg-editor text-secondary">
            <VscMarkdown className="h-4 w-4" />
          </div>

          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            {index + 1}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b border-default px-3">
            <div className="ui-micro-label">Markdown</div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className={`ui-control h-7 w-7 rounded-md ${
                  !isPreview ? "border border-default bg-editor text-primary" : ""
                }`}
                onClick={() => onChangeMode(cell.localId, "edit")}
                disabled={readOnly}
                title="Редактирование"
              >
                <VscEdit className="h-4 w-4" />
              </button>

              <button
                type="button"
                className={`ui-control h-7 w-7 rounded-md ${
                  isPreview ? "border border-default bg-editor text-primary" : ""
                }`}
                onClick={() => onChangeMode(cell.localId, "preview")}
                disabled={readOnly}
                title="Предпросмотр"
              >
                <VscEye className="h-4 w-4" />
              </button>

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
            {isPreview ? (
              <div className="px-3 py-3">
                <MarkdownRenderer
                  source={cell.source}
                  filePath={filePath}
                  className="rounded-[10px] border border-default bg-input px-4 py-4"
                />
              </div>
            ) : (
              <CellEditor
                editorPath={`${filePath}#${cell.localId}`}
                language="markdown"
                value={cell.source}
                theme={theme}
                fontSize={fontSize}
                beforeMount={beforeMount}
                onChange={(nextValue) => onChangeSource(cell.localId, nextValue)}
                onSaveRequest={onSaveRequest}
                onRunRequest={() => onPreviewCell(cell.localId)}
                onRunAndAdvanceRequest={() => onPreviewCellAndAdvance(cell.localId)}
                onFocusRequest={() => onSelect(cell.localId)}
                focusToken={focusToken}
                lineNumbers="off"
                minHeight={80}
                tabSize={tabSize}
                readOnly={readOnly}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
