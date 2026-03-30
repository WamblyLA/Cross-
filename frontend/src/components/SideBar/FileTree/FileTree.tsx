import FloatingMenu from "../../../ui/FloatingMenu";
import FileTreeInlineInput from "./FileTreeInlineInput";
import FileTreeList from "./FileTreeList";
import { useFileTreeController } from "./useFileTreeController";
import { getDraftPlaceholder } from "./fileTreeUtils";

export default function FileTree() {
  const controller = useFileTreeController();

  if (!controller.rootPath) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">
        Папка пока не открыта. Используйте Файл -&gt; Открыть папку в верхнем меню.
      </div>
    );
  }

  const showRootCreateDraft =
    controller.draft?.mode === "create" && controller.draft.parentPath === controller.rootPath;
  const rootDraft = showRootCreateDraft ? controller.draft : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {controller.error ? (
        <div className="border-b border-default px-3 py-2 text-sm text-error">
          {controller.error}
        </div>
      ) : null}

      <div
        ref={controller.containerRef}
        className={`ui-scrollbar min-h-0 flex-1 overflow-auto px-2 py-2 text-sm text-secondary outline-none ${
          controller.dropTarget?.kind === "root" ? "bg-hover" : ""
        }`}
        style={
          controller.invalidDropTargetKey === "root"
            ? { boxShadow: "inset 0 0 0 1px var(--error)" }
            : undefined
        }
        tabIndex={0}
        onContextMenu={controller.handleRootContextMenu}
        onKeyDown={controller.handleTreeKeyDown}
        onDragOver={controller.handleRootDragOver}
        onDragLeave={controller.handleRootDragLeave}
        onDrop={controller.handleRootDrop}
        onMouseDown={controller.handleContainerMouseDown}
      >
        {rootDraft ? (
          <FileTreeInlineInput
            value={rootDraft.value}
            placeholder={getDraftPlaceholder(rootDraft.nodeType)}
            depth={0}
            nodeType={rootDraft.nodeType}
            variant="draft"
            onChange={controller.setDraftValue}
            onSubmit={() => {
              void controller.handleDraftSubmit();
            }}
            onCancel={controller.cancelDraft}
          />
        ) : null}

        {controller.isLoading && !controller.hasAnyNodes ? (
          <div className="px-3 py-3 text-sm text-secondary">Загрузка проекта...</div>
        ) : null}

        {!controller.isLoading && !controller.hasVisibleNodes && controller.trimmedSearchQuery ? (
          <div className="px-3 py-3 text-sm text-muted">
            По запросу &quot;{controller.trimmedSearchQuery}&quot; ничего не найдено.
          </div>
        ) : null}

        {!controller.isLoading &&
        !controller.hasAnyNodes &&
        !controller.trimmedSearchQuery &&
        !showRootCreateDraft ? (
          <div className="px-3 py-3 text-sm text-muted">
            Папка пока пуста. Создайте новый файл или новую папку в проводнике.
          </div>
        ) : null}

        <FileTreeList
          rows={controller.visibleRows}
          draft={controller.draft}
          expandedSet={controller.expandedSet}
          selectedSet={controller.selectedSet}
          focusedPath={controller.focusedPath}
          draggedPathSet={controller.draggedPathSet}
          dropTarget={controller.dropTarget}
          invalidDropTargetKey={controller.invalidDropTargetKey}
          dragDisabled={!controller.isDragDropEnabled}
          onSelect={controller.handleSelectNode}
          onDoubleClick={controller.handleNodeDoubleClick}
          onToggleFolder={(node) => {
            void controller.handleToggleFolder(node);
          }}
          onContextMenu={controller.handleNodeContextMenu}
          onDraftChange={controller.setDraftValue}
          onDraftSubmit={() => {
            void controller.handleDraftSubmit();
          }}
          onDraftCancel={controller.cancelDraft}
          onDragStart={controller.handleNodeDragStart}
          onDragEnd={controller.handleNodeDragEnd}
          onDragOver={controller.handleNodeDragOver}
          onDragLeave={controller.handleNodeDragLeave}
          onDrop={controller.handleNodeDrop}
        />
      </div>

      {controller.deleteTarget ? (
        <div className="border-t border-default bg-panel px-3 py-3">
          <div className="text-sm text-primary">
            {controller.deleteTarget.items.length === 1
              ? `Удалить ${
                  controller.deleteTarget.items[0]?.nodeType === "folder" ? "папку" : "файл"
                } "${controller.deleteTarget.items[0]?.name}"?`
              : `Удалить выбранные элементы (${controller.deleteTarget.items.length})?`}
          </div>
          <div className="mt-1 text-xs leading-5 text-muted">
            Элементы будут удалены с локального диска. Удаление папок затронет все вложенные
            файлы.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="ui-button-secondary ui-control h-9 px-3 text-sm"
              onClick={() => controller.setDeleteTarget(null)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="ui-control h-9 rounded-[8px] border px-3 text-sm text-error hover:bg-hover"
              style={{ borderColor: "var(--error)" }}
              onClick={() => {
                void controller.confirmDelete();
              }}
            >
              Удалить
            </button>
          </div>
        </div>
      ) : null}

      {controller.contextMenu ? (
        <FloatingMenu
          sections={controller.contextMenuSections}
          position={{
            type: "point",
            x: controller.contextMenu.x,
            y: controller.contextMenu.y,
          }}
          width={240}
          onClose={() => controller.setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}
