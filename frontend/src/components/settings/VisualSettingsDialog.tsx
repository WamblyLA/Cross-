import { createPortal } from "react-dom";
import { VscChromeClose } from "react-icons/vsc";
import VisualSettingsPanel from "./VisualSettingsPanel";

type VisualSettingsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function VisualSettingsDialog({
  isOpen,
  onClose,
}: VisualSettingsDialogProps) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-4">
      <div className="ui-dialog flex max-h-[85vh] w-[min(100%,760px)] min-w-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-default px-5 py-4">
          <div>
            <div className="ui-eyebrow">Вид</div>
            <div className="text-base text-primary">Визуальные настройки</div>
          </div>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={onClose}
            title="Закрыть"
          >
            <VscChromeClose />
          </button>
        </div>

        <div className="ui-scrollbar-thin min-h-0 overflow-y-auto p-5">
          <VisualSettingsPanel
            title="Визуальные настройки IDE"
            description="Изменения применяются сразу к теме приложения и редакторам."
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
