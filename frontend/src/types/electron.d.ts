export {};

declare global {
  type FileSystemItem = {
    name: string;
    path: string;
    isDirectory: boolean;
  };

  type TerminalMeta = {
    id: string;
    title: string;
    shellLabel: string;
    kind: "shell";
    profileId: string;
    shellType: string;
  };

  type TerminalProfileDescriptor = {
    id: string;
    label: string;
    shellType: string;
    command: string;
    args: string[];
    source: string;
    isAvailable: boolean;
    isDefault: boolean;
  };

  type TerminalProfileDiscoveryStatus = "idle" | "loading" | "ready" | "error";

  type TerminalProfilesState = {
    profiles: TerminalProfileDescriptor[];
    defaultProfileId: string | null;
    discoveryStatus: TerminalProfileDiscoveryStatus;
  };

  type TerminalDataEvent = {
    terminalId: string;
    text: string;
  };

  type TerminalStatusEvent = {
    type: "closed";
    terminalId: string;
  };

  type RunWorkspaceDescriptor =
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

  type RunConfigurationKind = "python-file" | "python-project" | "cpp-file";
  type RunConfigurationSource = "builtin" | "user";
  type RunConfigurationWorkingDirectoryMode = "file-dir" | "project-root";

  type RunConfiguration = {
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

  type RunConfigurationListResult = {
    workspaceKey: string;
    selectedConfigId: string | null;
    configurations: RunConfiguration[];
  };

  type RunSessionStatus =
    | "preparing"
    | "materializing"
    | "building"
    | "running"
    | "finished"
    | "failed"
    | "interrupted"
    | "cancelled";

  type RunSession = {
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

  type RunStreamKind = "stdout" | "stderr" | "system";

  type RunDataEvent = {
    sessionId: string;
    text: string;
    stream: RunStreamKind;
    stage: string;
  };

  type RunPythonInterpreterDescriptor = {
    id: string;
    path: string;
    label: string;
    kind: string;
    isRecommended: boolean;
  };

  type RunCppToolchainDescriptor = {
    id: string;
    kind: string;
    label: string;
    path: string | null;
    setupScriptPath: string | null;
    isRecommended: boolean;
  };

  type RunLaunchActiveFile =
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

  type CloudFolderSummary = {
    id: string;
    projectId: string;
    parentId: string | null;
    name: string;
    createdAt: string;
    updatedAt: string;
  };

  type CloudFileSummary = {
    id: string;
    projectId: string;
    folderId: string | null;
    name: string;
    createdAt: string;
    updatedAt: string;
  };

  type CloudFile = CloudFileSummary & {
    content: string;
  };

  type CloudRunSnapshotFolder = CloudFolderSummary & {
    relativePath: string;
  };

  type CloudRunSnapshotFile = CloudFile & {
    relativePath: string;
  };

  type CloudProjectRunSnapshot = {
    projectId: string;
    projectName: string;
    folders: CloudRunSnapshotFolder[];
    files: CloudRunSnapshotFile[];
  };

  type RunLaunchRequest = {
    workspace: RunWorkspaceDescriptor;
    configurationId: string;
    activeFile: RunLaunchActiveFile | null;
    cloudSnapshot: CloudProjectRunSnapshot | null;
  };

  type NotebookKernelDiagnosticSeverity = "info" | "warn" | "error";

  type NotebookKernelDiscoveryDiagnostic = {
    source: string;
    severity: NotebookKernelDiagnosticSeverity;
    message: string;
    details?: string | null;
    interpreterPath?: string | null;
  };

  type NotebookKernelLaunchKind = "kernelspec" | "interpreter";

  type NotebookKernelDescriptor = {
    id: string;
    name: string;
    displayName: string;
    primaryLabel: string;
    secondaryLabel: string | null;
    language: string | null;
    executablePath: string | null;
    interpreterPath: string | null;
    interpreterVersion: string | null;
    environmentLabel: string | null;
    resourceDir: string | null;
    interruptMode: string | null;
    kind: "python" | "kernel";
    isRecommended: boolean;
    launchKind: NotebookKernelLaunchKind;
    kernelName: string | null;
  };

  type NotebookKernelSelection = Pick<
    NotebookKernelDescriptor,
    "id" | "displayName" | "launchKind" | "kernelName" | "interpreterPath"
  >;

  type NotebookKernelListResult = {
    kernels: NotebookKernelDescriptor[];
    refreshId: number;
    diagnostics: NotebookKernelDiscoveryDiagnostic[];
    durationMs: number;
  };

  type NotebookStreamOutput = {
    output_type: "stream";
    name: "stdout" | "stderr";
    text: string;
  };

  type NotebookErrorOutput = {
    output_type: "error";
    ename: string;
    evalue: string;
    traceback: string[];
  };

  type NotebookRichOutput = {
    output_type: "display_data" | "execute_result";
    data: Record<string, unknown>;
    metadata: Record<string, unknown>;
    execution_count?: number | null;
  };

  type NotebookOutput = NotebookStreamOutput | NotebookErrorOutput | NotebookRichOutput;

  type NotebookExecutionStatus = "ok" | "error" | "interrupted";
  type NotebookSessionStatus =
    | "unbound"
    | "starting"
    | "idle"
    | "busy"
    | "interrupting"
    | "restarting"
    | "failed"
    | "dead"
    | "disconnected";

  type LocalNotebookExecutionContext = {
    kind: "local";
    runtimeId: string;
    notebookPath: string;
    workspaceRootPath?: string | null;
  };

  type CloudNotebookExecutionContext = {
    kind: "cloud";
    runtimeId: string;
    editorPath: string;
    projectId: string;
    fileId: string;
    name: string;
    cloudSnapshot: CloudProjectRunSnapshot;
  };

  type NotebookExecutionContext =
    | LocalNotebookExecutionContext
    | CloudNotebookExecutionContext;

  type NotebookSessionInfo = {
    runtimeId: string;
    kernelId: string;
    kernelDisplayName: string | null;
    status: NotebookSessionStatus;
    detail: string | null;
    languageInfoName: string | null;
  };

  type NotebookExecutionResult = {
    status: NotebookExecutionStatus;
    executionCount: number | null;
    outputs: NotebookOutput[];
  };

  type NotebookDisplayUpdateTarget = {
    cellId: string;
    outputIndex: number;
  };

  type NotebookKernelEvent =
    | {
        type: "session-status";
        runtimeId: string;
        status: NotebookSessionStatus;
        detail?: string | null;
        kernelId?: string | null;
        kernelDisplayName?: string | null;
      }
    | {
        type: "session-error";
        runtimeId: string;
        message: string;
      }
    | {
        type: "execution-started";
        runtimeId: string;
        cellId: string;
        executionCount: number | null;
      }
    | {
        type: "output";
        runtimeId: string;
        cellId: string;
        output: NotebookOutput;
      }
    | {
        type: "display-update";
        runtimeId: string;
        displayId: string;
        targets: NotebookDisplayUpdateTarget[];
        output: Extract<NotebookOutput, { output_type: "display_data" | "execute_result" }>;
      }
    | {
        type: "execution-finished";
        runtimeId: string;
        cellId: string;
        status: NotebookExecutionStatus;
        executionCount: number | null;
        outputs: NotebookOutput[];
      };

  interface Window {
    electronAPI: {
      minimizeWindow: () => Promise<void>;
      toggleMaximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;

      openFolder: () => Promise<{
        folderPath: string;
        files: FileSystemItem[];
      } | null>;
      listFolder: (folderPath: string) => Promise<FileSystemItem[]>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<{ success: true }>;
      createFileSystemItem: (
        parentPath: string,
        name: string,
        isFolder: boolean,
      ) => Promise<{ success: true; path: string }>;
      renameFileSystemItem: (
        targetPath: string,
        newName: string,
      ) => Promise<{ success: true; path: string }>;
      removeFileSystemItem: (targetPath: string) => Promise<{ success: true }>;
      copyFileSystemItems: (
        sourcePaths: string[],
        targetDirectory: string,
      ) => Promise<{ success: true; paths: string[] }>;
      moveFileSystemItems: (
        sourcePaths: string[],
        targetDirectory: string,
      ) => Promise<{ success: true; paths: string[] }>;

      ensureTerminalSession: (
        terminalId?: string | null,
      ) => Promise<{
        terminal: TerminalMeta;
      }>;
      createTerminalSession: (options?: {
        profileId?: string | null;
      }) => Promise<{
        terminal: TerminalMeta;
        terminals: TerminalMeta[];
        activeTerminalId: string | null;
      }>;
      listTerminalSessions: () => Promise<{
        terminals: TerminalMeta[];
        activeTerminalId: string | null;
      }>;
      activateTerminalSession: (terminalId: string) => Promise<{
        terminals: TerminalMeta[];
        activeTerminalId: string;
      }>;
      closeTerminalSession: (terminalId: string) => Promise<{
        terminals: TerminalMeta[];
        activeTerminalId: string | null;
      }>;
      writeToTerminal: (data: string, terminalId?: string | null) => Promise<unknown>;
      resizeTerminal: (cols: number, rows: number, terminalId?: string | null) => Promise<{
        success: true;
      }>;
      interruptTerminal: (terminalId: string) => Promise<{
        success: true;
        terminal: TerminalMeta;
      }>;
      clearTerminal: (terminalId?: string | null) => Promise<{
        success: true;
        terminal: TerminalMeta;
      }>;
      printTerminalMessage: (text: string, terminalId?: string | null) => Promise<{
        success: true;
      }>;
      listTerminalProfiles: () => Promise<TerminalProfilesState>;
      setDefaultTerminalProfile: (profileId: string) => Promise<TerminalProfilesState>;

      listRunConfigurations: (
        workspaceDescriptor: RunWorkspaceDescriptor,
      ) => Promise<RunConfigurationListResult>;
      createRunConfiguration: (
        workspaceDescriptor: RunWorkspaceDescriptor,
        configurationInput: Partial<RunConfiguration>,
      ) => Promise<RunConfigurationListResult>;
      updateRunConfiguration: (
        workspaceDescriptor: RunWorkspaceDescriptor,
        configurationInput: Partial<RunConfiguration> & { id: string },
      ) => Promise<RunConfigurationListResult>;
      deleteRunConfiguration: (
        workspaceDescriptor: RunWorkspaceDescriptor,
        configurationId: string,
      ) => Promise<RunConfigurationListResult>;
      selectRunConfiguration: (
        workspaceDescriptor: RunWorkspaceDescriptor,
        configurationId: string,
      ) => Promise<RunConfigurationListResult>;
      listRunPythonInterpreters: (options?: {
        workspaceRootPath?: string | null;
      }) => Promise<{
        interpreters: RunPythonInterpreterDescriptor[];
      }>;
      listRunCppToolchains: () => Promise<{
        toolchains: RunCppToolchainDescriptor[];
      }>;
      startRunSession: (launchRequest: RunLaunchRequest) => Promise<{
        session: RunSession | null;
      }>;
      stopRunSession: () => Promise<{
        session: RunSession | null;
      }>;
      rerunRunSession: () => Promise<{
        session: RunSession | null;
      }>;
      writeToRunSession: (sessionId: string, data: string) => Promise<{
        success: boolean;
      }>;
      resizeRunSession: (sessionId: string, cols: number, rows: number) => Promise<{
        success: boolean;
      }>;
      getCurrentRunSession: () => Promise<{
        session: RunSession | null;
      }>;

      listNotebookKernels: (options?: {
        workspaceRootPath?: string | null;
      }) => Promise<NotebookKernelListResult>;
      refreshNotebookKernels: (options?: {
        workspaceRootPath?: string | null;
      }) => Promise<NotebookKernelListResult>;
      startNotebookSession: (payload: {
        runtimeContext: NotebookExecutionContext;
        kernel: NotebookKernelSelection;
      }) => Promise<{
        session: NotebookSessionInfo;
      }>;
      executeNotebookCell: (payload: {
        runtimeId: string;
        cellId: string;
        source: string;
      }) => Promise<NotebookExecutionResult>;
      interruptNotebookKernel: (runtimeId: string) => Promise<{
        success: true;
      }>;
      restartNotebookKernel: (runtimeId: string) => Promise<{
        session: NotebookSessionInfo;
      }>;
      shutdownNotebookSession: (runtimeId: string) => Promise<{
        success: true;
      }>;

      onFolderChanged: (
        callback: (payload: { event: string; path: string }) => void,
      ) => () => void;
      onTerminalData: (callback: (payload: TerminalDataEvent) => void) => () => void;
      onTerminalStatus: (callback: (payload: TerminalStatusEvent) => void) => () => void;
      onTerminalProfilesUpdated: (callback: (payload: TerminalProfilesState) => void) => () => void;
      onAppCommand: (callback: (payload: { commandId: string }) => void) => () => void;
      onRunData: (callback: (payload: RunDataEvent) => void) => () => void;
      onRunSession: (callback: (payload: RunSession) => void) => () => void;
      onNotebookKernelEvent: (callback: (payload: NotebookKernelEvent) => void) => () => void;
    };
  }
}
