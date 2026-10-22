import { createEmptyNotebookDocument, serializeNotebookDocument } from "../../features/files/notebookParser";
import type {
  CloudFileSummary,
  CloudFolderSummary,
  CloudFolderTreeNode,
  CloudProjectTree,
} from "../../types/projects";

export type NoticeState =
  | { tone: "success" | "error" | "info" | "warning"; text: string }
  | null;

export type NameDialogState =
  | null
  | {
      kind: "create-file";
      folderId: string | null;
      title: string;
      description: string;
      confirmLabel: string;
      initialValue?: string;
    }
  | {
      kind: "rename-file";
      fileId: string;
      title: string;
      description: string;
      confirmLabel: string;
      initialValue: string;
    }
  | {
      kind: "create-folder";
      parentId: string | null;
      title: string;
      description: string;
      confirmLabel: string;
      initialValue?: string;
    }
  | {
      kind: "rename-folder";
      folderId: string;
      title: string;
      description: string;
      confirmLabel: string;
      initialValue: string;
    };

export type MoveDialogState =
  | null
  | {
      kind: "move-file";
      fileId: string;
      initialProjectId: string;
      initialFolderId: string | null;
      title: string;
      description: string;
      confirmLabel: string;
    }
  | {
      kind: "move-folder";
      folderId: string;
      initialProjectId: string;
      initialFolderId: string | null;
      title: string;
      description: string;
      confirmLabel: string;
    };

export type ActionMenuState =
  | null
  | {
      title: string;
      items: Array<{
        key: string;
        label: string;
        tone?: "default" | "danger";
        onPress: () => void;
      }>;
    };

export function collectTreeLookups(tree: CloudProjectTree | undefined) {
  const filesById = new Map<string, CloudFileSummary>();
  const foldersById = new Map<string, CloudFolderSummary>();

  if (!tree) {
    return { filesById, foldersById };
  }

  const visitFolder = (folder: CloudFolderTreeNode) => {
    foldersById.set(folder.id, folder);
    folder.files.forEach((file) => filesById.set(file.id, file));
    folder.folders.forEach(visitFolder);
  };

  tree.files.forEach((file) => filesById.set(file.id, file));
  tree.folders.forEach(visitFolder);
  return { filesById, foldersById };
}

export function getInitialFileContent(fileName: string) {
  return fileName.trim().toLowerCase().endsWith(".ipynb")
    ? serializeNotebookDocument(createEmptyNotebookDocument())
    : "";
}
