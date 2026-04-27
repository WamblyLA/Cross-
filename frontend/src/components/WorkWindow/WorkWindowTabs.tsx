import { RxCross1 } from "react-icons/rx";
import type { OpenedFile } from "../../features/files/fileTypes";

type WorkWindowTabsProps = {
  openedFiles: OpenedFile[];
  activeTabId: string | null;
  onActivate: (tabId: string) => void;
  onRequestClose: (tabId: string) => void;
};

export default function WorkWindowTabs({
  openedFiles,
  activeTabId,
  onActivate,
  onRequestClose,
}: WorkWindowTabsProps) {
  return (
    <div className="ui-scrollbar-x flex items-end overflow-x-auto border-b border-default bg-editor px-2 pt-2">
      {openedFiles.length > 0 ? (
        openedFiles.map((file) => (
          <div
            key={file.tabId}
            role="button"
            tabIndex={0}
            onClick={() => onActivate(file.tabId)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onActivate(file.tabId);
              }
            }}
            className={`ui-tab flex items-center gap-2 px-3 py-2 ${
              activeTabId === file.tabId ? "ui-tab-active" : ""
            }`}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span>{file.name}</span>
              {file.kind === "cloud" ? (
                <span className="rounded-full border border-default px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted">
                  Облако
                </span>
              ) : null}
              {file.isDirty ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}
            </span>

            <button
              type="button"
              className="ui-control h-5 w-5 shrink-0"
              onClick={(event) => {
                event.stopPropagation();
                onRequestClose(file.tabId);
              }}
              title="Закрыть файл"
            >
              <RxCross1 className="h-3 w-3" />
            </button>
          </div>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-muted">Файлы пока не открыты</div>
      )}
    </div>
  );
}
