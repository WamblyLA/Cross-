import { VscAdd, VscMarkdown, VscSave } from "react-icons/vsc";

type NotebookToolbarProps = {
  cellCount: number;
  isDirty: boolean;
  isBlocked: boolean;
  statusMessage: string | null;
  onAddCodeCell: () => void;
  onAddMarkdownCell: () => void;
  onSave: () => Promise<void>;
};

export default function NotebookToolbar({
  cellCount,
  isDirty,
  isBlocked,
  statusMessage,
  onAddCodeCell,
  onAddMarkdownCell,
  onSave,
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
            disabled={isBlocked}
          >
            <VscAdd className="h-4 w-4" />
            <span>Code</span>
          </button>

          <button
            type="button"
            className="ui-control h-9 px-3"
            onClick={onAddMarkdownCell}
            disabled={isBlocked}
          >
            <VscMarkdown className="h-4 w-4" />
            <span>Markdown</span>
          </button>

          <button
            type="button"
            className="ui-control h-9 px-3"
            onClick={() => void onSave()}
            disabled={isBlocked}
          >
            <VscSave className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-secondary">
        <span>{cellCount} ячеек</span>
        <span>{isDirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</span>
        {statusMessage ? <span>{statusMessage}</span> : null}
      </div>
    </div>
  );
}
