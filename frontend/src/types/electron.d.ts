export {};

type FileSystemItem = {
  name: string;
  path: string;
  isDirectory: boolean;
};

type TerminalDataEvent = {
  text: string;
};

type TerminalStatusEvent =
  | {
      type: "closed";
    }
  | {
      type: "run-started";
      filePath: string;
      interpreter: string;
    }
  | {
      type: "run-finished";
      exitCode: number;
    };

declare global {
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

      ensureTerminalSession: () => Promise<{
        shellLabel: string;
      }>;
      writeToTerminal: (data: string) => Promise<{
        success: true;
        shellLabel: string;
      }>;
      resizeTerminal: (cols: number, rows: number) => Promise<{
        success: true;
      }>;
      clearTerminal: () => Promise<{
        success: true;
        shellLabel: string;
      }>;
      printTerminalMessage: (text: string) => Promise<{
        success: true;
      }>;
      runPythonInTerminal: (filePath: string) => Promise<{
        started: boolean;
        shellLabel?: string;
        reason?: string;
      }>;

      onFolderChanged: (
        callback: (payload: { event: string; path: string }) => void,
      ) => () => void;
      onTerminalData: (callback: (payload: TerminalDataEvent) => void) => () => void;
      onTerminalStatus: (callback: (payload: TerminalStatusEvent) => void) => () => void;
    };
  }
}
