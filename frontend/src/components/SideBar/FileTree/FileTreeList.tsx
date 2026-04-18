import type { DragEvent, MouseEvent } from "react";
import FileTreeRow from "./FileTreeRow";
import type { FileTreeGitDecoration } from "./fileTreeGit";
import type {
  DropTarget,
  FileTreeRowModel,
  TreeDraft,
  WorkspaceTreeNode,
} from "./fileTreeTypes";

type FileTreeListProps = {
  rows: FileTreeRowModel[];
  draft: TreeDraft | null;
  expandedSet: Set<string>;
  selectedSet: Set<string>;
  focusedPath: string | null;
  draggedPathSet: Set<string>;
  dropTarget: DropTarget | null;
  invalidDropTargetKey: string | null;
  gitDecorationsByPath: Map<string, FileTreeGitDecoration>;
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

export default function FileTreeList({
  rows,
  draft,
  expandedSet,
  selectedSet,
  focusedPath,
  draggedPathSet,
  dropTarget,
  invalidDropTargetKey,
  gitDecorationsByPath,
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
}: FileTreeListProps) {
  const folderDropTargetPath = dropTarget?.kind === "folder" ? dropTarget.path : null;
  const invalidFolderDropTargetPath = invalidDropTargetKey?.startsWith("folder:")
    ? invalidDropTargetKey.slice("folder:".length)
    : null;

  return (
    <>
      {rows.map((row) => {
        const rowPath = row.kind === "node" ? row.node.path : null;

        return (
          <FileTreeRow
            key={row.key}
            row={row}
            draft={draft}
            isSelected={rowPath ? selectedSet.has(rowPath) : false}
            isFocused={rowPath ? focusedPath === rowPath : false}
            isExpanded={row.kind === "node" ? expandedSet.has(row.node.path) : false}
            isDragging={rowPath ? draggedPathSet.has(rowPath) : false}
            isDropTarget={rowPath ? folderDropTargetPath === rowPath : false}
            isInvalidDropTarget={rowPath ? invalidFolderDropTargetPath === rowPath : false}
            gitDecoration={rowPath ? gitDecorationsByPath.get(rowPath) ?? null : null}
            dragDisabled={dragDisabled}
            onSelect={onSelect}
            onDoubleClick={onDoubleClick}
            onToggleFolder={onToggleFolder}
            onContextMenu={onContextMenu}
            onDraftChange={onDraftChange}
            onDraftSubmit={onDraftSubmit}
            onDraftCancel={onDraftCancel}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
        );
      })}
    </>
  );
}
