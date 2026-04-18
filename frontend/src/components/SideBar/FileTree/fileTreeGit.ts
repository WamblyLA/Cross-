import type { WorkspaceTreeNode } from "./fileTreeTypes";

export type FileTreeGitDecoration = {
  status: GitFileStatus;
  label: string;
  color: string;
};

const GIT_STATUS_PRIORITY: Record<GitFileStatus, number> = {
  deleted: 5,
  modified: 4,
  renamed: 3,
  added: 2,
  untracked: 1,
};

const GIT_STATUS_LABEL: Record<GitFileStatus, string> = {
  modified: "Изменён",
  added: "Добавлен",
  deleted: "Удалён",
  untracked: "Неотслеживаемый",
  renamed: "Переименован",
};

const GIT_STATUS_COLOR: Record<GitFileStatus, string> = {
  modified: "var(--warning)",
  added: "var(--success)",
  deleted: "var(--error)",
  untracked: "var(--accent-strong)",
  renamed: "var(--accent)",
};

function pickMoreImportantStatus(
  currentStatus: GitFileStatus | null,
  nextStatus: GitFileStatus,
) {
  if (!currentStatus) {
    return nextStatus;
  }

  return GIT_STATUS_PRIORITY[nextStatus] > GIT_STATUS_PRIORITY[currentStatus]
    ? nextStatus
    : currentStatus;
}

function toRelativePath(rootPath: string, targetPath: string) {
  const normalizedRoot = rootPath.replace(/[\\/]+$/, "");
  const normalizedTarget = targetPath.replace(/[\\/]+$/, "");

  if (
    normalizedTarget !== normalizedRoot &&
    !normalizedTarget.startsWith(`${normalizedRoot}\\`) &&
    !normalizedTarget.startsWith(`${normalizedRoot}/`)
  ) {
    return null;
  }

  return normalizedTarget
    .slice(normalizedRoot.length)
    .replace(/^[\\/]+/, "")
    .replace(/[\\]+/g, "/");
}

function toDecoration(status: GitFileStatus | null): FileTreeGitDecoration | null {
  if (!status) {
    return null;
  }

  return {
    status,
    label: GIT_STATUS_LABEL[status],
    color: GIT_STATUS_COLOR[status],
  };
}

export function buildFileTreeGitDecorations(input: {
  rootPath: string | null;
  gitState: WorkspaceGitState;
  nodeByPath: Map<string, WorkspaceTreeNode>;
}) {
  if (!input.rootPath || !input.gitState.available) {
    return new Map<string, FileTreeGitDecoration>();
  }

  const exactStatuses = new Map<string, GitFileStatus>();
  const folderStatuses = new Map<string, GitFileStatus>();

  Object.entries(input.gitState.statusesByRelativePath).forEach(([relativePath, status]) => {
    if (!relativePath) {
      return;
    }

    exactStatuses.set(relativePath, status);

    const segments = relativePath.split("/").filter(Boolean);

    while (segments.length > 1) {
      segments.pop();
      const folderRelativePath = segments.join("/");
      const currentStatus = folderStatuses.get(folderRelativePath) ?? null;
      folderStatuses.set(folderRelativePath, pickMoreImportantStatus(currentStatus, status));
    }
  });

  const decorationsByPath = new Map<string, FileTreeGitDecoration>();

  input.nodeByPath.forEach((node) => {
    const relativePath = toRelativePath(input.rootPath ?? "", node.path);

    if (!relativePath) {
      return;
    }

    const status = node.type === "file"
      ? exactStatuses.get(relativePath) ?? null
      : folderStatuses.get(relativePath) ?? null;
    const decoration = toDecoration(status);

    if (decoration) {
      decorationsByPath.set(node.path, decoration);
    }
  });

  return decorationsByPath;
}
