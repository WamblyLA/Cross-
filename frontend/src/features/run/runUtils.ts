import { getParentPath } from "../../utils/path";
import type { OpenedFile } from "../files/fileTypes";
import type {
  RunConfiguration,
  RunLaunchActiveFile,
  RunWorkspaceDescriptor,
} from "./runTypes";

type RunWorkspaceFileDescriptor =
  | {
      kind: "local";
      path: string;
      extension: string | null;
    }
  | {
      kind: "cloud";
      projectId: string;
      fileId: string;
      extension: string | null;
    };

type RunWorkspaceProjectDescriptor = {
  id: string;
  name: string;
};

function getLocalWorkspaceRoot(
  rootPath: string | null,
  activeFile: RunWorkspaceFileDescriptor | null,
) {
  if (rootPath) {
    return rootPath;
  }

  if (activeFile?.kind === "local") {
    return getParentPath(activeFile.path);
  }

  return null;
}

function getActiveExtension(activeFile: OpenedFile | null) {
  return activeFile?.extension?.toLowerCase() ?? null;
}

export function buildRunWorkspaceDescriptor(options: {
  source: "local" | "cloud";
  rootPath: string | null;
  activeFile: RunWorkspaceFileDescriptor | null;
  activeCloudProject: RunWorkspaceProjectDescriptor | null;
}): RunWorkspaceDescriptor | null {
  const activeFileExtension = options.activeFile?.extension ?? null;

  if (options.source === "cloud") {
    if (!options.activeCloudProject) {
      return null;
    }

    return {
      scope: "cloud",
      projectId: options.activeCloudProject.id,
      projectName: options.activeCloudProject.name,
      activeFileExtension,
    };
  }

  const localRootPath = getLocalWorkspaceRoot(options.rootPath, options.activeFile);

  if (!localRootPath) {
    return null;
  }

  return {
    scope: "local",
    rootPath: localRootPath,
    activeFileExtension,
  };
}

export function buildRunWorkspaceCacheKey(workspaceDescriptor: RunWorkspaceDescriptor | null) {
  if (!workspaceDescriptor) {
    return null;
  }

  if (workspaceDescriptor.scope === "local") {
    return `local:${workspaceDescriptor.rootPath}:${workspaceDescriptor.activeFileExtension ?? ""}`;
  }

  return `cloud:${workspaceDescriptor.projectId}:${workspaceDescriptor.activeFileExtension ?? ""}`;
}

export function buildRunLaunchActiveFile(activeFile: OpenedFile | null): RunLaunchActiveFile | null {
  if (!activeFile) {
    return null;
  }

  if (activeFile.kind === "local") {
    return {
      kind: "local",
      path: activeFile.path,
      name: activeFile.name,
      extension: activeFile.extension,
    };
  }

  return {
    kind: "cloud",
    projectId: activeFile.projectId,
    fileId: activeFile.fileId,
    name: activeFile.name,
    extension: activeFile.extension,
  };
}

export function getRunConfigurationAvailability(
  configuration: RunConfiguration | null,
  options: {
    workspaceDescriptor: RunWorkspaceDescriptor | null;
    activeFile: OpenedFile | null;
  },
) {
  if (!configuration || !options.workspaceDescriptor) {
    return {
      available: false,
      reason: "Нет активного проекта или файла для запуска.",
    };
  }

  if (configuration.kind === "python-project") {
    if (!configuration.entrypoint.trim()) {
      return {
        available: false,
        reason: "Укажите entrypoint для запуска Python-проекта.",
      };
    }

    return {
      available: true,
      reason: null,
    };
  }

  if (!options.activeFile) {
    return {
      available: false,
      reason: "Нет активного файла для запуска.",
    };
  }

  const activeExtension = getActiveExtension(options.activeFile);

  if (configuration.kind === "python-file") {
    return activeExtension === "py"
      ? { available: true, reason: null }
      : {
          available: false,
          reason: "Нужен активный файл с расширением .py.",
        };
  }

  if (configuration.kind === "cpp-file") {
    return ["cpp", "cc", "cxx"].includes(activeExtension ?? "")
      ? { available: true, reason: null }
      : {
          available: false,
          reason: "Нужен активный файл с расширением .cpp, .cc или .cxx.",
        };
  }

  return {
    available: false,
    reason: "Конфигурация запуска сейчас недоступна.",
  };
}
