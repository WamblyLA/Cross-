import type { MenuSection } from "../../../ui/FloatingMenu";
import type {
  ClipboardState,
  ContextMenuState,
  WorkspaceTreeNode,
} from "./fileTreeTypes";
import { pruneNestedPaths } from "./fileTreeUtils";

type FileTreeMenuArgs = {
  contextMenu: ContextMenuState | null;
  rootPath: string | null;
  clipboard: ClipboardState | null;
  nodeByPath: Map<string, WorkspaceTreeNode>;
  beginCreate: (nodeType: "file" | "folder", parentPathOverride?: string) => Promise<void>;
  beginRename: (node?: WorkspaceTreeNode) => void;
  beginDelete: (pathsOverride?: string[]) => void;
  handleOpenFile: (node: WorkspaceTreeNode) => Promise<void>;
  handlePaste: (targetPathOverride?: string) => Promise<void>;
  refreshTree: (nextExpandedPaths: string[]) => Promise<void>;
  copySelectionToClipboard: (mode: "copy" | "cut", pathsOverride?: string[]) => void;
  expandedPaths: string[];
};

export function buildFileTreeContextMenuSections({
  contextMenu,
  rootPath,
  clipboard,
  nodeByPath,
  beginCreate,
  beginRename,
  beginDelete,
  handleOpenFile,
  handlePaste,
  refreshTree,
  copySelectionToClipboard,
  expandedPaths,
}: FileTreeMenuArgs): MenuSection[] {
  if (!contextMenu || !rootPath) {
    return [];
  }

  if (contextMenu.kind === "root") {
    return [
      {
        id: "root-actions",
        items: [
          {
            id: "root-new-file",
            label: "Новый файл",
            onSelect: () => {
              void beginCreate("file", rootPath);
            },
          },
          {
            id: "root-new-folder",
            label: "Новая папка",
            onSelect: () => {
              void beginCreate("folder", rootPath);
            },
          },
          {
            id: "root-paste",
            label: clipboard?.mode === "cut" ? "Вставить (переместить)" : "Вставить",
            disabled: !clipboard,
            onSelect: () => {
              void handlePaste(rootPath);
            },
          },
          {
            id: "root-refresh",
            label: "Обновить",
            onSelect: () => {
              void refreshTree(expandedPaths);
            },
          },
        ],
      },
    ];
  }

  const normalizedPaths = pruneNestedPaths(contextMenu.paths);
  const primaryNode = nodeByPath.get(contextMenu.primaryPath);

  if (!primaryNode) {
    return [];
  }

  const singleSelection = normalizedPaths.length === 1;
  const canPasteIntoPrimary = primaryNode.type === "folder" && Boolean(clipboard);

  if (primaryNode.type === "folder") {
    return [
      {
        id: "folder-create",
        items: [
          {
            id: "folder-new-file",
            label: "Новый файл",
            disabled: !singleSelection,
            onSelect: () => {
              void beginCreate("file", primaryNode.path);
            },
          },
          {
            id: "folder-new-folder",
            label: "Новая папка",
            disabled: !singleSelection,
            onSelect: () => {
              void beginCreate("folder", primaryNode.path);
            },
          },
          {
            id: "folder-paste",
            label: clipboard?.mode === "cut" ? "Вставить (переместить)" : "Вставить",
            disabled: !canPasteIntoPrimary,
            onSelect: () => {
              void handlePaste(primaryNode.path);
            },
          },
        ],
      },
      {
        id: "folder-actions",
        items: [
          {
            id: "folder-copy",
            label: "Копировать",
            onSelect: () => copySelectionToClipboard("copy", normalizedPaths),
          },
          {
            id: "folder-cut",
            label: "Вырезать",
            onSelect: () => copySelectionToClipboard("cut", normalizedPaths),
          },
          {
            id: "folder-rename",
            label: "Переименовать",
            disabled: !singleSelection,
            onSelect: () => beginRename(primaryNode),
          },
          {
            id: "folder-delete",
            label: normalizedPaths.length > 1 ? "Удалить выбранное" : "Удалить",
            tone: "danger",
            onSelect: () => beginDelete(normalizedPaths),
          },
        ],
      },
    ];
  }

  return [
    {
      id: "file-actions",
      items: [
        {
          id: "file-open",
          label: "Открыть",
          disabled: !singleSelection,
          onSelect: () => {
            void handleOpenFile(primaryNode);
          },
        },
        {
          id: "file-copy",
          label: "Копировать",
          onSelect: () => copySelectionToClipboard("copy", normalizedPaths),
        },
        {
          id: "file-cut",
          label: "Вырезать",
          onSelect: () => copySelectionToClipboard("cut", normalizedPaths),
        },
        {
          id: "file-rename",
          label: "Переименовать",
          disabled: !singleSelection,
          onSelect: () => beginRename(primaryNode),
        },
        {
          id: "file-delete",
          label: normalizedPaths.length > 1 ? "Удалить выбранное" : "Удалить",
          tone: "danger",
          onSelect: () => beginDelete(normalizedPaths),
        },
      ],
    },
  ];
}
