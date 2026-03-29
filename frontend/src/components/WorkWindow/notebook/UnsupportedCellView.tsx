import { VscAdd, VscChevronDown, VscChevronUp, VscTrash } from "react-icons/vsc";
import type { NotebookCellModel } from "./types";

type UnsupportedCellViewProps = {
  cell: NotebookCellModel;
  index: number;
  onMove: (localId: string, direction: -1 | 1) => void;
  onDelete: (localId: string) => void;
  onAddBelow: (cellType: "code" | "markdown", afterIndex: number) => void;
};

export default function UnsupportedCellView({
  cell,
  index,
  onMove,
  onDelete,
  onAddBelow,
}: UnsupportedCellViewProps) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-default bg-panel shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm text-primary">Неподдерживаемая ячейка {index + 1}</div>
          <div className="text-xs text-muted">
            Тип ячейки `{cell.cellType}` показан только для чтения и будет сохранён без потери данных.
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
        <pre className="overflow-x-auto rounded-[16px] border border-default bg-input px-4 py-4 text-xs leading-6 text-secondary">
          {cell.source}
        </pre>

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
