import type { useCloudExplorerController } from "./useCloudExplorerController";

type CloudExplorerController = ReturnType<typeof useCloudExplorerController>;

type CloudExplorerDeleteBarProps = {
  controller: CloudExplorerController;
};

export default function CloudExplorerDeleteBar({
  controller,
}: CloudExplorerDeleteBarProps) {
  if (!controller.deleteTarget) {
    return null;
  }

  return (
    <div className="border-t border-default bg-panel px-3 py-3">
      <div className="text-sm text-primary">
        {controller.deleteTarget.kind === "selection"
          ? `Удалить выбранные элементы (${controller.deleteTarget.folderCount} папок, ${controller.deleteTarget.fileCount} файлов)?`
          : `${controller.deleteTarget.kind === "project" ? "Удалить проект" : controller.deleteTarget.kind === "folder" ? "Удалить папку" : "Удалить файл"} "${controller.deleteTarget.name}"?`}
      </div>
      <div className="mt-1 text-xs leading-5 text-muted">
        {controller.deleteTarget.kind === "selection"
          ? "Выбранные папки и файлы будут удалены из облака. Вложенные элементы выбранных папок не будут обрабатываться повторно."
          : controller.deleteTarget.kind === "project"
            ? "Все файлы и папки проекта будут удалены из облака, а связанные вкладки в IDE закроются."
            : controller.deleteTarget.kind === "folder"
              ? "Папка будет удалена вместе со всем вложенным содержимым."
              : "Файл будет удалён из облака, а открытая вкладка закроется автоматически."}
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
            void controller.handleDeleteConfirm();
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
