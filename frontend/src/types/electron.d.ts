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
    kind: "shell" | "python-run";
  };

  type TerminalDataEvent = {
    terminalId: string;
    text: string;
  };

  type TerminalStatusEvent =
    | {
        type: "closed";
        terminalId: string;
      }
    | {
        type: "run-started";
        terminalId: string;
        filePath: string;
        interpreter: string;
      }
    | {
        type: "run-finished";
        terminalId: string;
        exitCode: number;
      };

  type NotebookKernelKind = "venv" | "conda" | "system";
  type NotebookKernelManagerName =
    | "workspace-venv"
    | "conda"
    | "pyenv"
    | "poetry"
    | "pipenv"
    | "launcher"
    | "path"
    | "registry"
    | "known-install"
    | "selected";
  type NotebookKernelLocationKind =
    | "workspace-local"
    | "user-local"
    | "global-path"
    | "system";
  type NotebookKernelDiagnosticSeverity = "info" | "warn" | "error";

  type NotebookKernelDiscoveryDiagnostic = {
    source: string;
    severity: NotebookKernelDiagnosticSeverity;
    message: string;
    details?: string | null;
    interpreterPath?: string | null;
    manager?: NotebookKernelManagerName | null;
    phase?: string | null;
    cwd?: string | null;
    durationMs?: number | null;
    lastOutputLine?: string | null;
  };

  type NotebookKernelDescriptor = {
    id: string;
    interpreterPath: string;
    resolvedInterpreterPath: string;
    displayName: string;
    version: string | null;
    kind: NotebookKernelKind;
    source: string;
    manager: NotebookKernelManagerName;
    locationKind: NotebookKernelLocationKind;
    envName: string;
    isRecommended: boolean;
    isWorkspaceLocal: boolean;
    diagnostics: NotebookKernelDiscoveryDiagnostic[];
    isLaunchable: boolean;
  };

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

  type NotebookExecutionResult = {
    status: NotebookExecutionStatus;
    executionCount: number | null;
    outputs: NotebookOutput[];
    interpreterPath: string;
  };

  type NotebookKernelEvent =
    | {
        type: "kernel-ready";
        notebookPath: string;
        interpreterPath: string;
        displayName: string;
        version: string | null;
      }
    | {
        type: "kernel-restarted";
        notebookPath: string;
        interpreterPath: string;
      }
    | {
        type: "kernel-exited";
        notebookPath: string;
        interpreterPath: string;
        reason: string;
      }
    | {
        type: "execution-started";
        notebookPath: string;
        cellId: string;
        executionCount: number | null;
      }
    | {
        type: "output";
        notebookPath: string;
        cellId: string;
        output: NotebookOutput;
      }
    | {
        type: "execution-finished";
        notebookPath: string;
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

      ensureTerminalSession: (
        terminalId?: string | null,
      ) => Promise<{
        terminal: TerminalMeta;
      }>;
      createTerminalSession: () => Promise<{
        terminal: TerminalMeta;
      }>;
      closeTerminalSession: (terminalId: string) => Promise<{
        success: true;
      }>;
      writeToTerminal: (data: string, terminalId?: string | null) => Promise<{
        success: true;
        terminal: TerminalMeta;
      }>;
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
      runPythonInTerminal: (filePath: string) => Promise<{
        started: boolean;
        terminal?: TerminalMeta;
        reason?: string;
      }>;
      listNotebookKernels: (options?: {
        workspacePath?: string | null;
        notebookPath?: string | null;
      }) => Promise<NotebookKernelListResult>;
      refreshNotebookKernels: (options?: {
        workspacePath?: string | null;
        notebookPath?: string | null;
      }) => Promise<NotebookKernelListResult>;
      getNotebookKernelDiagnostics: (options?: {
        workspacePath?: string | null;
        notebookPath?: string | null;
      }) => Promise<NotebookKernelDiscoveryDiagnostic[]>;
      executeNotebookCell: (payload: {
        notebookPath: string;
        interpreterPath: string;
        cellId: string;
        source: string;
      }) => Promise<NotebookExecutionResult>;
      interruptNotebookKernel: (notebookPath: string) => Promise<{
        success: true;
      }>;
      restartNotebookKernel: (payload: {
        notebookPath: string;
        interpreterPath: string;
      }) => Promise<{
        success: true;
        kernel: NotebookKernelDescriptor | null;
      }>;
      releaseNotebookKernel: (notebookPath: string) => Promise<{
        success: true;
      }>;

      onFolderChanged: (
        callback: (payload: { event: string; path: string }) => void,
      ) => () => void;
      onTerminalData: (callback: (payload: TerminalDataEvent) => void) => () => void;
      onTerminalStatus: (callback: (payload: TerminalStatusEvent) => void) => () => void;
      onNotebookKernelEvent: (callback: (payload: NotebookKernelEvent) => void) => () => void;
    };
  }
}
