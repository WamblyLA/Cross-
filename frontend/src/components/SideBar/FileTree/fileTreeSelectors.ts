import type { FsNodeType } from "../../../utils/path";
import type {
  FileTreeDraftRow,
  FileTreeLoadingRow,
  FileTreeNodeRow,
  FileTreeRowModel,
  WorkspaceTreeNode,
} from "./fileTreeTypes";

type FileTreeSelectorInput = {
  tree: WorkspaceTreeNode[];
  expandedPaths: string[];
  searchQuery: string;
  loadingPath: string | null;
  createDraft:
    | {
        parentPath: string;
        nodeType: FsNodeType;
      }
    | null;
};

export type FileTreeDerivedState = {
  nodeByPath: Map<string, WorkspaceTreeNode>;
  parentByPath: Map<string, string | null>;
  allPaths: Set<string>;
  visibleRows: FileTreeRowModel[];
  visibleNodePaths: string[];
  hasAnyNodes: boolean;
  hasVisibleNodes: boolean;
};

type VisibleVisitResult = {
  matches: boolean;
  rows: FileTreeRowModel[];
};

export function buildFileTreeDerivedState({
  tree,
  expandedPaths,
  searchQuery,
  loadingPath,
  createDraft,
}: FileTreeSelectorInput): FileTreeDerivedState {
  const expandedSet = new Set(expandedPaths);
  const nodeByPath = new Map<string, WorkspaceTreeNode>();
  const parentByPath = new Map<string, string | null>();
  const allPaths = new Set<string>();
  const loweredQuery = searchQuery.trim().toLowerCase();
  const hasQuery = loweredQuery.length > 0;

  const indexNodes = (nodes: WorkspaceTreeNode[], parentPath: string | null) => {
    nodes.forEach((node) => {
      nodeByPath.set(node.path, node);
      parentByPath.set(node.path, parentPath);
      allPaths.add(node.path);

      if (node.type === "folder" && node.children.length > 0) {
        indexNodes(node.children, node.path);
      }
    });
  };

  const buildVisibleRows = (
    nodes: WorkspaceTreeNode[],
    depth: number,
    parentPath: string | null,
  ): FileTreeRowModel[] => {
    const rows: FileTreeRowModel[] = [];

    nodes.forEach((node) => {
      const result = visitVisibleNode(node, depth, parentPath);

      if (result.matches) {
        rows.push(...result.rows);
      }
    });

    return rows;
  };

  const visitVisibleNode = (
    node: WorkspaceTreeNode,
    depth: number,
    parentPath: string | null,
  ): VisibleVisitResult => {
    const childRows =
      node.type === "folder" && node.children.length > 0
        ? buildVisibleRows(node.children, depth + 1, node.path)
        : [];
    const nodeMatches = !hasQuery || node.name.toLowerCase().includes(loweredQuery);
    const childMatches = childRows.length > 0;

    if (!nodeMatches && !childMatches) {
      return {
        matches: false,
        rows: [],
      };
    }

    const currentRow: FileTreeNodeRow = {
      kind: "node",
      key: node.path,
      depth,
      parentPath,
      node,
    };
    const rows: FileTreeRowModel[] = [currentRow];

    if (node.type === "folder" && expandedSet.has(node.path)) {
      if (createDraft?.parentPath === node.path) {
        const draftRow: FileTreeDraftRow = {
          kind: "draft",
          key: `draft:${node.path}`,
          depth: depth + 1,
          parentPath: node.path,
          nodeType: createDraft.nodeType,
        };
        rows.push(draftRow);
      }

      if (loadingPath === node.path) {
        const loadingRow: FileTreeLoadingRow = {
          kind: "loading",
          key: `loading:${node.path}`,
          depth: depth + 1,
          parentPath: node.path,
        };
        rows.push(loadingRow);
      }

      rows.push(...childRows);
    }

    return {
      matches: true,
      rows,
    };
  };

  indexNodes(tree, null);

  const visibleRows = buildVisibleRows(tree, 0, null);
  const visibleNodePaths = visibleRows.flatMap((row) =>
    row.kind === "node" ? [row.node.path] : [],
  );

  return {
    nodeByPath,
    parentByPath,
    allPaths,
    visibleRows,
    visibleNodePaths,
    hasAnyNodes: tree.length > 0,
    hasVisibleNodes: visibleNodePaths.length > 0,
  };
}
