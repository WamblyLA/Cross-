import { FiFileText } from "react-icons/fi";
import { createCloudSelectionEntry } from "../../../features/cloud/cloudSelection";
import type { CloudFileSummary } from "../../../features/cloud/cloudTypes";
import { hasPrimaryModifier } from "./cloudExplorerSelection";
import CloudInlineInput from "./CloudInlineInput";
import type { useCloudExplorerController } from "./useCloudExplorerController";

type CloudExplorerController = ReturnType<typeof useCloudExplorerController>;

type CloudFileRowProps = {
  controller: CloudExplorerController;
  projectId: string;
  file: CloudFileSummary;
  depth: number;
};

export default function CloudFileRow({
  controller,
  projectId,
  file,
  depth,
}: CloudFileRowProps) {
  const draft = controller.draft;
  const fileSelectionItem = createCloudSelectionEntry({
    itemType: "file",
    projectId,
    fileId: file.id,
    folderId: file.folderId ?? null,
    name: file.name,
  });
  const isSelectedFile = controller.selectedItemKeySet.has(fileSelectionItem.key);
  const isRenamingFile = draft?.kind === "file" && draft.mode === "rename" && draft.fileId === file.id;
  const isFileDragging =
    controller.dragState?.kind === "file" &&
    controller.dragState.projectId === projectId &&
    controller.dragState.fileId === file.id;

  if (isRenamingFile) {
    return (
        <CloudInlineInput
          icon={<FiFileText className="h-4 w-4" />}
          value={draft.value}
        placeholder="Новое имя файла"
        depth={depth}
        onChange={(value) => controller.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
        onSubmit={() => {
          void controller.handleDraftSubmit();
        }}
        onCancel={() => controller.setDraft(null)}
      />
    );
  }

  return (
    <div
      data-cloud-node="true"
      className="px-2 py-1.5"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onContextMenu={(event) => controller.handleFileContextMenu(projectId, file, event)}
    >
      <button
        type="button"
        className={`ui-tree-item flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left ${
          isSelectedFile ? "border border-default bg-active text-primary" : ""
        } ${isFileDragging ? "opacity-60" : ""}`}
        onClick={(event) => {
          controller.updateFileOrFolderSelection(fileSelectionItem, event);
          if (!event.shiftKey && !hasPrimaryModifier(event)) {
            void controller.handleOpenFile(projectId, file.id);
          }
        }}
        draggable={controller.isDragDropEnabled}
        onDragStart={(event) => controller.handleFileDragStart(projectId, file, event)}
        onDragEnd={controller.handleCloudDragEnd}
      >
        <span className="flex w-4 shrink-0 justify-center text-secondary">
          <FiFileText className="h-4 w-4" />
        </span>
        <span className="block min-w-0 flex-1 truncate text-sm">{file.name}</span>
      </button>
    </div>
  );
}
