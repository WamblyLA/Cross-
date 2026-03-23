import { useEffect, useRef } from "react";
import { CiFileOn } from "react-icons/ci";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { IoMdFolder, IoMdFolderOpen } from "react-icons/io";
import { RiArrowDropDownLine, RiArrowDropRightLine } from "react-icons/ri";
import { VscNewFile, VscNewFolder } from "react-icons/vsc";
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
          {nodeType === "folder" ? <IoMdFolder className="h-4 w-4" /> : <CiFileOn className="h-4 w-4" />}
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
  selectedPath: string | null;
  draft: TreeDraft | null;
  loadingPath: string | null;
  onToggleFolder: (node: WorkspaceTreeNode) => void;
  onOpenFile: (node: WorkspaceTreeNode) => void;
  onRequestCreate: (parentPath: string, nodeType: FsNodeType) => void;
  onRequestRename: (node: WorkspaceTreeNode) => void;
  onRequestDelete: (node: WorkspaceTreeNode) => void;
  onDraftChange: (value: string) => void;
  onDraftSubmit: () => void;
  onDraftCancel: () => void;
};

export default function TreeItem({
  node,
  depth,
  expandedPaths,
  selectedPath,
  draft,
  loadingPath,
  onToggleFolder,
  onOpenFile,
  onRequestCreate,
  onRequestRename,
  onRequestDelete,
  onDraftChange,
  onDraftSubmit,
  onDraftCancel,
}: TreeItemProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isRenaming = draft?.mode === "rename" && draft.targetPath === node.path;
  const showCreateInside = draft?.mode === "create" && draft.parentPath === node.path && isExpanded;

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-2 px-2 py-1.5 text-left ${
          isSelected ? "ui-tree-item border border-default bg-active text-primary" : "ui-tree-item"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isRenaming ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
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
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => {
              if (node.type === "folder") {
                onToggleFolder(node);
                return;
              }

              onOpenFile(node);
            }}
          >
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

            <span className="block min-w-0 flex-1 truncate text-sm">{node.name}</span>
          </button>
        )}

        {!isRenaming ? (
          <div
            className={`ml-auto flex items-center gap-1 transition-opacity ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {node.type === "folder" ? (
              <>
                <button
                  type="button"
                  className="ui-control h-6 w-6"
                  title="Новый файл"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRequestCreate(node.path, "file");
                  }}
                >
                  <VscNewFile className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="ui-control h-6 w-6"
                  title="Новая папка"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRequestCreate(node.path, "folder");
                  }}
                >
                  <VscNewFolder className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}

            <button
              type="button"
              className="ui-control h-6 w-6"
              title="Переименовать"
              onClick={(event) => {
                event.stopPropagation();
                onRequestRename(node);
              }}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              className="ui-control h-6 w-6"
              title="Удалить"
              onClick={(event) => {
                event.stopPropagation();
                onRequestDelete(node);
              }}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
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
              selectedPath={selectedPath}
              draft={draft}
              loadingPath={loadingPath}
              onToggleFolder={onToggleFolder}
              onOpenFile={onOpenFile}
              onRequestCreate={onRequestCreate}
              onRequestRename={onRequestRename}
              onRequestDelete={onRequestDelete}
              onDraftChange={onDraftChange}
              onDraftSubmit={onDraftSubmit}
              onDraftCancel={onDraftCancel}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
