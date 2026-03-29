import type { CloudProjectRunSnapshot } from "../cloud/cloudTypes";

export type RunWorkspaceDescriptor =
  | {
      scope: "local";
      rootPath: string;
      activeFileExtension?: string | null;
    }
  | {
      scope: "cloud";
      projectId: string;
      projectName: string;
      activeFileExtension?: string | null;
    };

export type RunConfigurationKind = "python-file" | "python-project" | "cpp-file";
export type RunConfigurationSource = "builtin" | "user";
export type RunConfigurationWorkingDirectoryMode = "file-dir" | "project-root";

export type RunConfiguration = {
  id: string;
  source: RunConfigurationSource;
  kind: RunConfigurationKind;
  language: "python" | "cpp";
  mode: "file" | "project";
  name: string;
  workingDirectoryMode: RunConfigurationWorkingDirectoryMode;
  interpreterPath?: string;
  compilerPath?: string;
  argumentsText: string;
  environmentText: string;
  compilerArgumentsText: string;
  entrypoint: string;
  isEditable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type RunConfigurationListResult = {
  workspaceKey: string;
  selectedConfigId: string | null;
  configurations: RunConfiguration[];
};

export type RunSessionStatus =
  | "preparing"
  | "materializing"
  | "building"
  | "running"
  | "finished"
  | "failed"
  | "interrupted"
  | "cancelled";

export type RunSession = {
  id: string;
  configurationId: string;
  configurationName: string;
  configurationKind: RunConfigurationKind;
  workspaceKey: string;
  workspaceLabel: string;
  status: RunSessionStatus;
  stage: string;
  statusText: string;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  errorMessage: string | null;
  targetPath: string | null;
  workingDirectory: string | null;
  runtimeLabel: string | null;
  supportsInput: boolean;
  isBusy: boolean;
  canRerun: boolean;
};

export type RunStreamKind = "stdout" | "stderr" | "system";

export type RunOutputChunk = {
  id: string;
  sessionId: string;
  text: string;
  stream: RunStreamKind;
  stage: string;
};

export type RunDataEvent = {
  sessionId: string;
  text: string;
  stream: RunStreamKind;
  stage: string;
};

export type RunPythonInterpreterDescriptor = {
  id: string;
  path: string;
  label: string;
  kind: string;
  isRecommended: boolean;
};

export type RunCppToolchainDescriptor = {
  id: string;
  kind: string;
  label: string;
  path: string | null;
  setupScriptPath: string | null;
  isRecommended: boolean;
};

export type RunLaunchActiveFile =
  | {
      kind: "local";
      path: string;
      name: string;
      extension: string | null;
    }
  | {
      kind: "cloud";
      projectId: string;
      fileId: string;
      name: string;
      extension: string | null;
    };

export type RunLaunchRequest = {
  workspace: RunWorkspaceDescriptor;
  configurationId: string;
  activeFile: RunLaunchActiveFile | null;
  cloudSnapshot: CloudProjectRunSnapshot | null;
};
