import { createPortal } from "react-dom";

type UnsavedFileCloseDialogProps = {
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function UnsavedFileCloseDialog({
  fileName,
  onConfirm,
  onCancel,
}: UnsavedFileCloseDialogProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-4">
      <div className="ui-dialog flex w-[min(100%,460px)] min-w-0 flex-col px-6 py-5">
        <div className="text-base text-primary">Вы точно хотите закрыть файл?</div>
        <div className="mt-2 text-sm leading-6 text-secondary">
          Есть несохраненные изменения в файле "{fileName}".
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            className="ui-button-secondary ui-control h-9 px-4 text-sm"
            onClick={onCancel}
          >
            Отмена
          </button>
          <button
            type="button"
            className="ui-control h-9 rounded-[8px] border px-4 text-sm text-error hover:bg-hover"
            style={{ borderColor: "var(--error)" }}
            onClick={onConfirm}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
