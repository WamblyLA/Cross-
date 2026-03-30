import type { FsNodeType } from "../../../utils/path";

export type FileSystemItem = {
  name: string;
  path: string;
  isDirectory: boolean;
};

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

export type DeleteItem = {
  path: string;
  name: string;
  nodeType: FsNodeType;
};

export type DeleteTarget = {
  items: DeleteItem[];
};

export type ClipboardState = {
  mode: "copy" | "cut";
  paths: string[];
};

export type ContextMenuState =
  | {
      kind: "root";
      x: number;
      y: number;
    }
  | {
      kind: "selection";
      x: number;
      y: number;
      paths: string[];
      primaryPath: string;
    };

export type DragState = {
  paths: string[];
};

export type DropTarget =
  | {
      kind: "root";
    }
  | {
      kind: "folder";
      path: string;
    };

export type FileTreeNodeRow = {
  kind: "node";
  key: string;
  depth: number;
  parentPath: string | null;
  node: WorkspaceTreeNode;
};

export type FileTreeDraftRow = {
  kind: "draft";
  key: string;
  depth: number;
  parentPath: string;
  nodeType: FsNodeType;
};

export type FileTreeLoadingRow = {
  kind: "loading";
  key: string;
  depth: number;
  parentPath: string;
};

export type FileTreeRowModel = FileTreeNodeRow | FileTreeDraftRow | FileTreeLoadingRow;
