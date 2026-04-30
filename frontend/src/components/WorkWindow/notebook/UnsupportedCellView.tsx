import { useEffect, useRef } from "react";
import { VscChevronDown, VscChevronUp, VscTrash, VscWarning } from "react-icons/vsc";
import type { NotebookCellModel } from "./types";

type UnsupportedCellViewProps = {
  cell: NotebookCellModel;
  index: number;
  isSelected: boolean;
  readOnly?: boolean;
  focusToken: number;
  onSelect: (localId: string) => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onDelete: (localId: string) => void;
};

export default function UnsupportedCellView({
  cell,
  index,
  isSelected,
  readOnly = false,
  focusToken,
  onSelect,
  onMove,
  onDelete,
}: UnsupportedCellViewProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!focusToken) {
      return;
    }

    sectionRef.current?.focus();
  }, [focusToken]);

  return (
    <section
      ref={sectionRef}
      tabIndex={0}
      className={`overflow-hidden rounded-[10px] border bg-panel transition-colors ${
        isSelected
          ? "border-[color:var(--accent)] shadow-[inset_2px_0_0_0_var(--accent)]"
          : "border-default"
      }`}
      onMouseDown={() => onSelect(cell.localId)}
      onFocus={() => onSelect(cell.localId)}
    >
      <div className="grid grid-cols-[52px_minmax(0,1fr)]">
        <div
          className={`flex min-h-full flex-col items-center gap-2 border-r px-2 py-3 ${
            isSelected ? "border-[color:var(--accent)] bg-editor" : "border-default bg-panel"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-default bg-editor text-[color:var(--warning)]">
            <VscWarning className="h-4 w-4" />
          </div>

          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            {index + 1}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b border-default px-3">
            <div className="min-w-0">
              <div className="ui-micro-label">Unsupported</div>
              <div className="truncate text-xs text-secondary">{cell.cellType}</div>
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

          <div className="border-t-0 bg-editor px-3 py-3">
            <pre className="ui-scrollbar-x overflow-x-auto rounded-[10px] border border-default bg-input px-4 py-3 text-xs leading-6 text-secondary">
              {cell.source}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
