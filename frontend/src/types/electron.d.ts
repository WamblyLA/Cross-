export {};

declare global {
  interface Window {
    electronAPI: {
      minimizeWindow: () => Promise<void>;
      toggleMaximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;

      openFolder: () => Promise<{
        folderPath: string;
        files: { name: string; isDirectory: boolean }[];
      } | null>;
      listFolder: (
        folderPath: string,
      ) => Promise<{ name: string; isDirectory: boolean }[]>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (
        filePath: string,
        content: string,
      ) => Promise<{ success: true }>;
      createFileSystemItem: (
        parentPath: string,
        name: string,
        isFolder: boolean,
      ) => Promise<{ success: true }>;
      removeFileSystemItem: (targetPath: string) => Promise<{ success: true }>;
      onFolderChanged: (
        callback: (payload: { event: string; path: string }) => void,
      ) => () => void;
    };
  }
}
