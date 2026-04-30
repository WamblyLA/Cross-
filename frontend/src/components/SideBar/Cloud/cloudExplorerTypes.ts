import type {
  CloudFileSummary,
  CloudFolderTreeNode,
  CloudProject,
} from "../../../features/cloud/cloudTypes";
import type { CloudExplorerSelectionItem } from "./cloudExplorerSelection";

export type DraftState =
  | {
      kind: "project";
      mode: "create" | "rename";
      projectId?: string;
      value: string;
    }
  | {
      kind: "folder";
      mode: "create" | "rename";
      projectId: string;
      parentId: string | null;
      folderId?: string;
      value: string;
    }
  | {
      kind: "file";
      mode: "create" | "rename";
      projectId: string;
      folderId: string | null;
      fileId?: string;
      value: string;
    };

export type DeleteTarget =
  | { kind: "project"; projectId: string; name: string }
  | { kind: "folder"; projectId: string; folderId: string; name: string }
  | { kind: "file"; projectId: string; fileId: string; name: string }
  | {
      kind: "selection";
      projectId: string;
      items: CloudExplorerSelectionItem[];
      folderCount: number;
      fileCount: number;
    };

export type ContextMenuState =
  | { kind: "root"; x: number; y: number }
  | { kind: "project"; x: number; y: number; project: CloudProject }
  | { kind: "folder"; x: number; y: number; projectId: string; folder: CloudFolderTreeNode }
  | { kind: "file"; x: number; y: number; projectId: string; file: CloudFileSummary };

export type DragState =
  | {
      kind: "file";
      projectId: string;
      fileId: string;
      folderId: string | null;
      name: string;
      items: CloudExplorerSelectionItem[];
    }
  | {
      kind: "folder";
      projectId: string;
      folderId: string;
      parentId: string | null;
      name: string;
      items: CloudExplorerSelectionItem[];
    };

export type DropTarget =
  | { kind: "project"; projectId: string }
  | { kind: "folder"; projectId: string; folderId: string };
