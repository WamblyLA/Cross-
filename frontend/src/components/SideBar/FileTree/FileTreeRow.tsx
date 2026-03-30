import { memo, type DragEvent, type MouseEvent } from "react";
import { CiFileOn } from "react-icons/ci";
import { IoMdFolder, IoMdFolderOpen } from "react-icons/io";
import { RiArrowDropDownLine, RiArrowDropRightLine } from "react-icons/ri";
import {
  FILE_TREE_INDENT_SIZE_PX,
  FILE_TREE_ROW_BASE_PADDING_PX,
} from "./fileTreeConstants";
import FileTreeInlineInput from "./FileTreeInlineInput";
import { getDraftPlaceholder, getRenamePlaceholder } from "./fileTreeUtils";
import type { FileTreeRowModel, TreeDraft, WorkspaceTreeNode } from "./fileTreeTypes";

type FileTreeRowProps = {
  row: FileTreeRowModel;
  draft: TreeDraft | null;
  isSelected: boolean;
  isFocused: boolean;
  isExpanded: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  isInvalidDropTarget: boolean;
  dragDisabled: boolean;
  onSelect: (node: WorkspaceTreeNode, event: MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (node: WorkspaceTreeNode) => void;
  onToggleFolder: (node: WorkspaceTreeNode) => void;
  onContextMenu: (node: WorkspaceTreeNode, event: MouseEvent<HTMLDivElement>) => void;
  onDraftChange: (value: string) => void;
  onDraftSubmit: () => void;
  onDraftCancel: () => void;
  onDragStart: (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => void;
  onDrop: (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => void;
};

function FileTreeRow({
  row,
  draft,
  isSelected,
  isFocused,
  isExpanded,
  isDragging,
  isDropTarget,
  isInvalidDropTarget,
  dragDisabled,
  onSelect,
  onDoubleClick,
  onToggleFolder,
  onContextMenu,
  onDraftChange,
  onDraftSubmit,
  onDraftCancel,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileTreeRowProps) {
  if (row.kind === "loading") {
    return (
      <div
        className="px-2 py-1 text-xs text-muted"
        style={{
          paddingLeft: `${row.depth * FILE_TREE_INDENT_SIZE_PX + FILE_TREE_ROW_BASE_PADDING_PX}px`,
        }}
      >
        Загрузка...
      </div>
    );
  }

  if (row.kind === "draft" && draft?.mode === "create") {
    return (
      <FileTreeInlineInput
        value={draft.value}
        placeholder={getDraftPlaceholder(draft.nodeType)}
        depth={row.depth}
        nodeType={row.nodeType}
        variant="draft"
        onChange={onDraftChange}
        onSubmit={onDraftSubmit}
        onCancel={onDraftCancel}
      />
    );
  }

  if (row.kind !== "node") {
    return null;
  }

  const { node, depth } = row;
  const isRenaming = draft?.mode === "rename" && draft.targetPath === node.path;
  const arrowIcon =
    node.type === "folder" ? (
      isExpanded ? (
        <RiArrowDropDownLine className="h-4 w-4" />
      ) : (
        <RiArrowDropRightLine className="h-4 w-4" />
      )
    ) : null;
  const fileIcon =
    node.type === "folder" ? (
      isExpanded ? (
        <IoMdFolderOpen className="h-4 w-4" />
      ) : (
        <IoMdFolder className="h-4 w-4" />
      )
    ) : (
      <CiFileOn className="h-4 w-4" />
    );

  return (
    <div className="select-none">
      <div
        data-tree-node="true"
        className="px-2 py-1.5"
        style={{ paddingLeft: `${depth * FILE_TREE_INDENT_SIZE_PX + FILE_TREE_ROW_BASE_PADDING_PX}px` }}
        onContextMenu={(event) => onContextMenu(node, event)}
      >
        {isRenaming ? (
          <FileTreeInlineInput
            value={draft.value}
            placeholder={getRenamePlaceholder(draft)}
            depth={depth}
            nodeType={node.type}
            variant="rename"
            leadingSlot={arrowIcon}
            withOuterPadding={false}
            onChange={onDraftChange}
            onSubmit={onDraftSubmit}
            onCancel={onDraftCancel}
          />
        ) : (
          <div
            role="treeitem"
            aria-selected={isSelected}
            className={`ui-tree-item flex min-w-0 items-center gap-2 px-2 py-1.5 text-left ${
              isSelected ? "border border-default bg-active text-primary" : "text-secondary"
            } ${isFocused ? "ring-1 ring-default" : ""} ${isDragging ? "opacity-60" : ""} ${
              isDropTarget ? "ring-1 ring-default bg-hover" : ""
            }`}
            style={
              isInvalidDropTarget
                ? { boxShadow: "inset 0 0 0 1px var(--error)" }
                : undefined
            }
            title={node.name}
            onMouseDown={(event) => onSelect(node, event)}
            onDoubleClick={() => onDoubleClick(node)}
            draggable={!dragDisabled}
            onDragStart={(event) => onDragStart(node, event)}
            onDragEnd={onDragEnd}
            onDragOver={(event) => onDragOver(node, event)}
            onDragLeave={(event) => onDragLeave(node, event)}
            onDrop={(event) => onDrop(node, event)}
          >
            <button
              type="button"
              className="flex w-4 shrink-0 justify-center text-secondary"
              onClick={(event) => {
                event.stopPropagation();

                if (node.type === "folder") {
                  onToggleFolder(node);
                }
              }}
              tabIndex={-1}
            >
              {arrowIcon}
            </button>

            <span className="flex w-4 shrink-0 justify-center text-secondary">{fileIcon}</span>
            <span className="block min-w-0 flex-1 truncate text-sm">{node.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FileTreeRow);
