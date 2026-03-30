import { useEffect, useRef } from "react";
import { VscChevronDown, VscChevronUp, VscTrash } from "react-icons/vsc";
import type { NotebookCellModel } from "./types";

type UnsupportedCellViewProps = {
  cell: NotebookCellModel;
  index: number;
  isSelected: boolean;
  focusToken: number;
  onSelect: (localId: string) => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onDelete: (localId: string) => void;
};

export default function UnsupportedCellView({
  cell,
  index,
  isSelected,
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
      className={`overflow-hidden rounded-[18px] border bg-panel shadow-sm transition-colors ${
        isSelected ? "border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/30" : "border-default"
      }`}
      onMouseDown={() => onSelect(cell.localId)}
      onFocus={() => onSelect(cell.localId)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm text-primary">
            {`Неподдерживаемая ячейка ${index + 1}`}
          </div>
          <div className="text-xs text-muted">
            {`Тип \`${cell.cellType}\` пока доступен только для чтения и будет сохранён без потери данных.`}
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
        <pre className="ui-scrollbar-x overflow-x-auto rounded-[16px] border border-default bg-input px-4 py-4 text-xs leading-6 text-secondary">
          {cell.source}
        </pre>
      </div>
    </section>
  );
}
