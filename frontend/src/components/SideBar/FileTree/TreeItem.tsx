import { useEffect, useRef, type DragEvent, type MouseEvent } from "react";
import { CiFileOn } from "react-icons/ci";
import { IoMdFolder, IoMdFolderOpen } from "react-icons/io";
import { RiArrowDropDownLine, RiArrowDropRightLine } from "react-icons/ri";
import type { FsNodeType } from "../../../utils/path";

export type WorkspaceTreeNode = {
  name: string;
  path: string;
  type: FsNodeType;
  children: WorkspaceTreeNode[];
  isLoaded: boolean;
};

export type TreeDraft =
  | {
      mode: "create";
      parentPath: string;
      nodeType: FsNodeType;
      value: string;
    }
  | {
      mode: "rename";
      targetPath: string;
      parentPath: string;
      nodeType: FsNodeType;
      value: string;
    };

type InlineNameInputProps = {
  value: string;
  placeholder: string;
  depth: number;
  nodeType: FsNodeType;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function InlineNameInput({
  value,
  placeholder,
  depth,
  nodeType,
  onChange,
  onSubmit,
  onCancel,
}: InlineNameInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="px-2 py-1.5" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
      <div className="ui-tree-item flex items-center gap-2 border border-default bg-active px-2 py-1.5">
        <span className="w-4 shrink-0" />
        <span className="w-4 shrink-0 text-secondary">
          {nodeType === "folder" ? (
            <IoMdFolder className="h-4 w-4" />
          ) : (
            <CiFileOn className="h-4 w-4" />
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onCancel}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder={placeholder}
          className="w-full border-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}

type TreeItemProps = {
  node: WorkspaceTreeNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedPaths: Set<string>;
  focusedPath: string | null;
  draft: TreeDraft | null;
  loadingPath: string | null;
  onSelect: (node: WorkspaceTreeNode, event: MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (node: WorkspaceTreeNode) => void;
  onToggleFolder: (node: WorkspaceTreeNode) => void;
  onContextMenu: (node: WorkspaceTreeNode, event: MouseEvent<HTMLDivElement>) => void;
  onDraftChange: (value: string) => void;
  onDraftSubmit: () => void;
  onDraftCancel: () => void;
  dragDisabled?: boolean;
  draggedPaths?: Set<string>;
  dropTargetPath?: string | null;
  invalidDropTargetPath?: string | null;
  onDragStart?: (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onDragOver?: (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (node: WorkspaceTreeNode, event: DragEvent<HTMLDivElement>) => void;
};

export default function TreeItem({
  node,
  depth,
  expandedPaths,
  selectedPaths,
  focusedPath,
  draft,
  loadingPath,
  onSelect,
  onDoubleClick,
  onToggleFolder,
  onContextMenu,
  onDraftChange,
  onDraftSubmit,
  onDraftCancel,
  dragDisabled = false,
  draggedPaths,
  dropTargetPath = null,
  invalidDropTargetPath = null,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: TreeItemProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPaths.has(node.path);
  const isFocused = focusedPath === node.path;
  const isRenaming = draft?.mode === "rename" && draft.targetPath === node.path;
  const showCreateInside = draft?.mode === "create" && draft.parentPath === node.path && isExpanded;
  const isDragging = draggedPaths?.has(node.path) ?? false;
  const isDropTarget = node.type === "folder" && dropTargetPath === node.path;
  const isInvalidDropTarget = node.type === "folder" && invalidDropTargetPath === node.path;

  return (
    <div className="select-none">
      <div
        data-tree-node="true"
        className="px-2 py-1.5"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onContextMenu={(event) => onContextMenu(node, event)}
      >
        {isRenaming ? (
          <div className="ui-tree-item flex min-w-0 items-center gap-2 border border-default bg-active px-2 py-1.5">
            <span className="flex w-4 shrink-0 justify-center text-secondary">
              {node.type === "folder" ? (
                isExpanded ? (
                  <RiArrowDropDownLine className="h-4 w-4" />
                ) : (
                  <RiArrowDropRightLine className="h-4 w-4" />
                )
              ) : null}
            </span>
            <span className="flex w-4 shrink-0 justify-center text-secondary">
              {node.type === "folder" ? (
                isExpanded ? (
                  <IoMdFolderOpen className="h-4 w-4" />
                ) : (
                  <IoMdFolder className="h-4 w-4" />
                )
              ) : (
                <CiFileOn className="h-4 w-4" />
              )}
            </span>
            <input
              type="text"
              value={draft.value}
              onChange={(event) => onDraftChange(event.target.value)}
              onBlur={onDraftCancel}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onDraftSubmit();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onDraftCancel();
                }
              }}
              className="w-full rounded-[6px] border border-default bg-input px-2 py-1 text-sm text-primary focus:outline-none focus:ring-0"
              autoFocus
            />
          </div>
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
            onDragStart={(event) => onDragStart?.(node, event)}
            onDragEnd={onDragEnd}
            onDragOver={(event) => onDragOver?.(node, event)}
            onDragLeave={(event) => onDragLeave?.(node, event)}
            onDrop={(event) => onDrop?.(node, event)}
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
              {node.type === "folder" ? (
                isExpanded ? (
                  <RiArrowDropDownLine className="h-4 w-4" />
                ) : (
                  <RiArrowDropRightLine className="h-4 w-4" />
                )
              ) : null}
            </button>

            <span className="flex w-4 shrink-0 justify-center text-secondary">
              {node.type === "folder" ? (
                isExpanded ? (
                  <IoMdFolderOpen className="h-4 w-4" />
                ) : (
                  <IoMdFolder className="h-4 w-4" />
                )
              ) : (
                <CiFileOn className="h-4 w-4" />
              )}
            </span>

            <span className="block min-w-0 flex-1 truncate text-sm">{node.name}</span>
          </div>
        )}
      </div>

      {node.type === "folder" && isExpanded ? (
        <div>
          {showCreateInside ? (
            <InlineNameInput
              value={draft.value}
              placeholder={draft.nodeType === "folder" ? "Имя новой папки" : "Имя нового файла"}
              depth={depth + 1}
              nodeType={draft.nodeType}
              onChange={onDraftChange}
              onSubmit={onDraftSubmit}
              onCancel={onDraftCancel}
            />
          ) : null}

          {loadingPath === node.path ? (
            <div
              className="px-2 py-1 text-xs text-muted"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              Загрузка...
            </div>
          ) : null}

          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPaths={selectedPaths}
              focusedPath={focusedPath}
              draft={draft}
              loadingPath={loadingPath}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
              onToggleFolder={onToggleFolder}
              onContextMenu={onContextMenu}
              onDraftChange={onDraftChange}
              onDraftSubmit={onDraftSubmit}
              onDraftCancel={onDraftCancel}
              dragDisabled={dragDisabled}
              draggedPaths={draggedPaths}
              dropTargetPath={dropTargetPath}
              invalidDropTargetPath={invalidDropTargetPath}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
