import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { SyncPreview } from "../../features/sync/syncTypes";

type SyncPreviewDialogProps = {
  isOpen: boolean;
  preview: SyncPreview | null;
  isApplying: boolean;
  error: string | null;
  onClose: () => void;
  onApply: (confirmedDeletePaths: Set<string>) => Promise<void>;
};

export default function SyncPreviewDialog({
  isOpen,
  preview,
  isApplying,
  error,
  onClose,
  onApply,
}: SyncPreviewDialogProps) {
  const [confirmedDeletePaths, setConfirmedDeletePaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    setConfirmedDeletePaths(new Set());
  }, [preview?.id]);

  const deleteItems = useMemo(
    () => preview?.items.filter((item) => item.action === "delete") ?? [],
    [preview],
  );
  const hasBlockedItems = Boolean(preview?.items.some((item) => item.blockedByDirtyTab));
  const hasUnconfirmedDeletes = deleteItems.some((item) => !confirmedDeletePaths.has(item.relativePath));

  if (!isOpen || !preview || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-4">
      <div className="ui-dialog flex h-[min(86vh,720px)] w-[min(100%,880px)] min-w-0 flex-col overflow-hidden px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base text-primary">
              {preview.direction === "push" ? "Отправить в облако" : "Получить из облака"}
            </div>
            <div className="mt-2 text-sm leading-6 text-secondary">
              Проверьте список изменений. Применение возможно только после подтверждения удалений и при отсутствии dirty-вкладок.
            </div>
          </div>

          <button type="button" className="ui-control h-8 w-8" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-secondary">
          <div>Создать: {preview.summary.createCount}</div>
          <div>Обновить: {preview.summary.updateCount}</div>
          <div>Удалить: {preview.summary.deleteCount}</div>
          <div className={hasBlockedItems ? "text-error" : ""}>Заблокировано: {preview.summary.blockedCount}</div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-default">
          {preview.items.length === 0 ? (
            <div className="px-4 py-5 text-sm text-secondary">Изменений для синхронизации не найдено.</div>
          ) : (
            <div className="divide-y divide-default">
              {preview.items.map((item) => (
                <div key={`${item.kind}:${item.relativePath}`} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-primary">{item.relativePath || "/"}</div>
                      <div className="mt-1 text-xs text-secondary">{item.reason}</div>
                    </div>
                    <div className="shrink-0 text-xs text-muted">
                      {item.kind === "folder" ? "Папка" : "Файл"}
                      {item.action ? ` · ${item.action}` : ""}
                    </div>
                  </div>

                  {item.blockedByDirtyTab ? (
                    <div className="mt-2 text-xs text-error">
                      Несохранённые изменения мешают синхронизации.
                    </div>
                  ) : null}

                  {item.requiresDeleteConfirm ? (
                    <label className="mt-2 flex items-center gap-2 text-xs text-secondary">
                      <input
                        type="checkbox"
                        checked={confirmedDeletePaths.has(item.relativePath)}
                        onChange={(event) => {
                          setConfirmedDeletePaths((current) => {
                            const next = new Set(current);

                            if (event.target.checked) {
                              next.add(item.relativePath);
                            } else {
                              next.delete(item.relativePath);
                            }

                            return next;
                          });
                        }}
                      />
                      Подтверждаю удаление этого элемента.
                    </label>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <div className="mt-4 text-sm text-error">{error}</div> : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" className="ui-button-secondary ui-control h-9 px-4 text-sm" onClick={onClose}>
            Закрыть
          </button>
          <button
            type="button"
            className="ui-button-primary ui-control h-9 px-4 text-sm"
            disabled={isApplying || hasBlockedItems || hasUnconfirmedDeletes}
            onClick={() => {
              void onApply(confirmedDeletePaths).catch(() => undefined);
            }}
          >
            Применить
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
