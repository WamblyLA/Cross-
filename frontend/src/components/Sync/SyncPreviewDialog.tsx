import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSelectedSyncPreviewItems,
  getSyncPreviewItemKey,
  isSyncPreviewItemActionable,
  selectAllActionableItems,
  summarizeSyncPreviewItems,
  toggleSyncPreviewItemSelection,
} from "../../features/sync/syncPreviewSelection";
import type { SyncPlanItem, SyncPreview } from "../../features/sync/syncTypes";

type SyncPreviewDialogProps = {
  isOpen: boolean;
  preview: SyncPreview | null;
  isLoading: boolean;
  isApplying: boolean;
  error: string | null;
  onClose: () => void;
  onApply: (selectedItemKeys: Set<string>) => Promise<void>;
};

function getDirectionTitle(direction: SyncPreview["direction"]) {
  return direction === "push" ? "Отправить в облако" : "Получить из облака";
}

function getKindLabel(item: SyncPlanItem) {
  return item.kind === "folder" ? "Папка" : "Файл";
}

function getActionLabel(item: SyncPlanItem) {
  if (item.action === "create") {
    return "Создать";
  }

  if (item.action === "update") {
    return "Изменить";
  }

  if (item.action === "delete") {
    return "Удалить";
  }

  return "Без действия";
}

export default function SyncPreviewDialog({
  isOpen,
  preview,
  isLoading,
  isApplying,
  error,
  onClose,
  onApply,
}: SyncPreviewDialogProps) {
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSelectedItemKeys(new Set());
  }, [preview?.id]);

  const actionableItemCount = useMemo(
    () => preview?.items.filter((item) => isSyncPreviewItemActionable(item)).length ?? 0,
    [preview],
  );
  const selectedItems = useMemo(
    () => (preview ? getSelectedSyncPreviewItems(preview, selectedItemKeys) : []),
    [preview, selectedItemKeys],
  );
  const selectedSummary = useMemo(
    () => summarizeSyncPreviewItems(selectedItems),
    [selectedItems],
  );
  const hasSelectedBlockedItems = selectedItems.some((item) => item.blockedByDirtyTab);
  const isAllSelected =
    actionableItemCount > 0 && selectedItems.length === actionableItemCount;
  const isPartiallySelected =
    selectedItems.length > 0 && selectedItems.length < actionableItemCount;
  const canApply =
    Boolean(preview) &&
    selectedItems.length > 0 &&
    !hasSelectedBlockedItems &&
    !isLoading &&
    !isApplying;

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = isPartiallySelected;
  }, [isPartiallySelected]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-4">
      <div className="ui-dialog flex h-[min(86vh,720px)] w-[min(100%,880px)] min-w-0 flex-col overflow-hidden px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base text-primary">
              {preview ? getDirectionTitle(preview.direction) : "Синхронизация"}
            </div>
            <div className="mt-2 text-sm leading-6 text-secondary">
              {isLoading
                ? "Подготавливаем список изменений. Большие файлы и блокноты могут занять немного времени."
                : "Выберите изменения для синхронизации. Удаление подтверждается обычной галочкой выбора, как и остальные операции."}
            </div>
          </div>

          <button type="button" className="ui-control h-8 w-8" onClick={onClose}>
            X
          </button>
        </div>

        {preview ? (
          <>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-secondary">
              <div>Создать: {preview.summary.createCount}</div>
              <div>Изменить: {preview.summary.updateCount}</div>
              <div>Удалить: {preview.summary.deleteCount}</div>
              <div className={preview.summary.blockedCount > 0 ? "text-error" : ""}>
                Заблокировано: {preview.summary.blockedCount}
              </div>
              <div className={selectedSummary.totalCount > 0 ? "text-primary" : ""}>
                Выбрано: {selectedSummary.totalCount}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border border-default px-4 py-3">
              <label className="flex items-center gap-3 text-sm text-primary">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllSelected}
                  disabled={actionableItemCount === 0}
                  onChange={(event) => {
                    if (!preview) {
                      return;
                    }

                    setSelectedItemKeys(
                      event.target.checked ? selectAllActionableItems(preview) : new Set(),
                    );
                  }}
                />
                <span>Выбрать все изменения</span>
              </label>

              <div className="text-xs text-secondary">
                Будет применено: {selectedSummary.totalCount}
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-default">
              {preview.items.length === 0 ? (
                <div className="px-4 py-5 text-sm text-secondary">
                  Изменений для синхронизации не найдено.
                </div>
              ) : (
                <div className="divide-y divide-default">
                  {preview.items.map((item) => {
                    const itemKey = getSyncPreviewItemKey(item);
                    const isChecked = selectedItemKeys.has(itemKey);
                    const isDisabled = !isSyncPreviewItemActionable(item);

                    return (
                      <div key={itemKey} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex min-w-0 flex-1 items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={isChecked}
                              disabled={isDisabled}
                              onChange={(event) => {
                                if (!preview) {
                                  return;
                                }

                                setSelectedItemKeys((currentSelection) =>
                                  toggleSyncPreviewItemSelection(
                                    preview,
                                    currentSelection,
                                    itemKey,
                                    event.target.checked,
                                  ),
                                );
                              }}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm text-primary">
                                {item.relativePath || "/"}
                              </div>
                              <div className="mt-1 text-xs text-secondary">{item.reason}</div>
                            </div>
                          </label>

                          <div className="shrink-0 text-xs text-muted">
                            {getKindLabel(item)} · {getActionLabel(item)}
                          </div>
                        </div>

                        {item.blockedByDirtyTab ? (
                          <div className="mt-2 text-xs text-error">
                            Несохранённые изменения во вкладке мешают синхронизации этого элемента.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-default px-4 py-5 text-sm text-secondary">
            {isLoading
              ? "Собираем preview синхронизации..."
              : error ?? "Не удалось подготовить preview синхронизации."}
          </div>
        )}

        {preview && error ? <div className="mt-4 text-sm text-error">{error}</div> : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            className="ui-button-secondary ui-control h-9 px-4 text-sm"
            onClick={onClose}
          >
            Закрыть
          </button>
          <button
            type="button"
            className="ui-button-primary ui-control h-9 px-4 text-sm"
            disabled={!canApply}
            onClick={() => {
              void onApply(selectedItemKeys).catch(() => undefined);
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
