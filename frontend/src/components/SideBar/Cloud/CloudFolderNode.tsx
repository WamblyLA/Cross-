import { FiChevronDown, FiChevronRight, FiFileText, FiFolder } from "react-icons/fi";
import { createCloudSelectionEntry } from "../../../features/cloud/cloudSelection";
import type { CloudFolderTreeNode } from "../../../features/cloud/cloudTypes";
import { hasPrimaryModifier } from "./cloudExplorerSelection";
import CloudFileRow from "./CloudFileRow";
import CloudInlineInput from "./CloudInlineInput";
import type { useCloudExplorerController } from "./useCloudExplorerController";
import { getCloudDropTargetKey } from "./cloudExplorerUtils";

type CloudExplorerController = ReturnType<typeof useCloudExplorerController>;

type CloudFolderNodeProps = {
  controller: CloudExplorerController;
  projectId: string;
  folder: CloudFolderTreeNode;
  depth?: number;
};

export default function CloudFolderNode({
  controller,
  projectId,
  folder,
  depth = 1,
}: CloudFolderNodeProps) {
  const draft = controller.draft;
  const isExpanded = controller.expandedFolderIds.includes(folder.id);
  const selectionItem = createCloudSelectionEntry({
    itemType: "folder",
    projectId,
    folderId: folder.id,
    parentId: folder.parentId,
    name: folder.name,
  });
  const isSelected = controller.selectedItemKeySet.has(selectionItem.key);
  const isRenaming = draft?.kind === "folder" && draft.mode === "rename" && draft.folderId === folder.id;
  const showCreateFolder =
    draft?.kind === "folder" && draft.mode === "create" && draft.parentId === folder.id;
  const showCreateFile =
    draft?.kind === "file" && draft.mode === "create" && draft.folderId === folder.id;
  const dropKey = `folder:${projectId}:${folder.id}`;
  const isFolderDragging =
    controller.dragState?.kind === "folder" &&
    controller.dragState.projectId === projectId &&
    controller.dragState.folderId === folder.id;
  const isFolderDropTarget = getCloudDropTargetKey(controller.dropTarget) === dropKey;
  const isFolderInvalidDropTarget = controller.invalidDropTargetKey === dropKey;

  return (
    <div key={folder.id}>
      {isRenaming ? (
        <CloudInlineInput
          icon={<FiFolder className="h-4 w-4" />}
          value={draft.value}
          placeholder="Новое имя папки"
          depth={depth}
          onChange={(value) => controller.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
          onSubmit={() => {
            void controller.handleDraftSubmit();
          }}
          onCancel={() => controller.setDraft(null)}
        />
      ) : (
        <div
          data-cloud-node="true"
          className="px-2 py-1.5"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onContextMenu={(event) => controller.handleFolderContextMenu(projectId, folder, event)}
          onDragOver={(event) => controller.handleFolderDragOver(projectId, folder.id, event)}
          onDragLeave={(event) => controller.handleCloudDragLeave({ kind: "folder", projectId, folderId: folder.id }, event)}
          onDrop={(event) => controller.handleFolderDrop(projectId, folder.id, event)}
        >
          <button
            type="button"
            className={`ui-tree-item flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left ${
              isSelected ? "border border-default bg-active text-primary" : ""
            } ${isFolderDropTarget ? "ring-1 ring-default bg-hover" : ""} ${
              isFolderDragging ? "opacity-60" : ""
            }`}
            style={isFolderInvalidDropTarget ? { boxShadow: "inset 0 0 0 1px var(--error)" } : undefined}
            onClick={(event) => {
              controller.updateFileOrFolderSelection(selectionItem, event);

              if (!event.shiftKey && !hasPrimaryModifier(event)) {
                controller.toggleFolder(folder.id);
              }
            }}
            draggable={controller.isDragDropEnabled}
            onDragStart={(event) => controller.handleFolderDragStart(projectId, folder, event)}
            onDragEnd={controller.handleCloudDragEnd}
          >
            <span className="flex w-4 shrink-0 justify-center text-secondary">
              {isExpanded ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
            </span>
            <span className="flex w-4 shrink-0 justify-center text-secondary">
              <FiFolder className="h-4 w-4" />
            </span>
            <span className="block min-w-0 flex-1 truncate text-sm">{folder.name}</span>
          </button>
        </div>
      )}

      {isExpanded ? (
        <div>
          {showCreateFolder ? (
            <CloudInlineInput
              icon={<FiFolder className="h-4 w-4" />}
              value={draft.value}
              placeholder="Имя новой папки"
              depth={depth + 1}
              onChange={(value) => controller.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
              onSubmit={() => {
                void controller.handleDraftSubmit();
              }}
              onCancel={() => controller.setDraft(null)}
            />
          ) : null}
          {showCreateFile ? (
            <CloudInlineInput
              icon={<FiFileText className="h-4 w-4" />}
              value={draft.value}
              placeholder="Имя нового файла"
              depth={depth + 1}
              onChange={(value) => controller.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
              onSubmit={() => {
                void controller.handleDraftSubmit();
              }}
              onCancel={() => controller.setDraft(null)}
            />
          ) : null}

          {folder.folders.map((childFolder) => (
            <CloudFolderNode
              key={childFolder.id}
              controller={controller}
              projectId={projectId}
              folder={childFolder}
              depth={depth + 1}
            />
          ))}

          {folder.files.map((file) => (
            <CloudFileRow
              key={file.id}
              controller={controller}
              projectId={projectId}
              file={file}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
