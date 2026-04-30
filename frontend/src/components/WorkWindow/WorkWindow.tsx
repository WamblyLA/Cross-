import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { selectIsAuthenticated } from "../../features/auth/authSelectors";
import { selectCloudActiveProject } from "../../features/cloud/cloudSelectors";
import { useCloudRealtimeFile } from "../../features/cloud/realtime/useCloudRealtimeFile";
import {
  closeFile,
  markFileDirty,
  setActiveFile,
  updateFileContent,
} from "../../features/files/filesSlice";
import {
  selectActiveFile,
  selectActiveTabId,
  selectOpenedFiles,
} from "../../features/files/filesSelectors";
import { selectCurrentVisualSettings } from "../../features/visualSettings/visualSettingsSelectors";
import { useWorkspaceActions } from "../../hooks/useWorkspaceActions";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { registerMonacoThemes } from "../../styles/monacoTheme";
import { getMonacoThemeName, type ThemeName } from "../../styles/tokens";
import MarkdownEditor from "./MarkdownEditor";
import NotebookEditor from "./NotebookEditor";
import UnsavedFileCloseDialog from "./UnsavedFileCloseDialog";
import WorkWindowTabs from "./WorkWindowTabs";
import { getEditorLanguage } from "./workWindowLanguage";
import { getWorkWindowEmptyStateContent } from "./workWindowEmptyStateContent";
import { EmptyEditorState } from "./workWindowEmptyState";

type WorkWindowProps = {
  theme: ThemeName;
};

export default function WorkWindow({ theme }: WorkWindowProps) {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const activeCloudProject = useAppSelector(selectCloudActiveProject);
  const openedFiles = useAppSelector(selectOpenedFiles);
  const activeTabId = useAppSelector(selectActiveTabId);
  const activeFile = useAppSelector(selectActiveFile);
  const visualSettings = useAppSelector(selectCurrentVisualSettings);
  const { saveActiveFile, saveFileByTabId } = useWorkspaceActions();

  const isNotebookFile = activeFile?.extension?.toLowerCase() === "ipynb";
  const isMarkdownFile = activeFile?.extension?.toLowerCase() === "md";
  const isCloudReadOnly = activeFile?.kind === "cloud" && !activeFile.canWrite;

  useCloudRealtimeFile(activeFile);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const previousNotebookTabIdsRef = useRef<Set<string>>(new Set());
  const [pendingCloseFile, setPendingCloseFile] = useState<{
    tabId: string;
    fileName: string;
  } | null>(null);

  const handleSave = useCallback(async () => {
    const result = await saveActiveFile();

    if (!result.ok && result.message) {
      console.error(result.message);
    }
  }, [saveActiveFile]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const disposable = editorRef.current.addAction({
      id: "save-file",
      label: "Сохранить файл",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: async () => {
        await handleSave();
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [handleSave]);

  useEffect(() => {
    const currentNotebookTabIds = new Set(
      openedFiles
        .filter((file) => file.extension?.toLowerCase() === "ipynb")
        .map((file) => file.tabId),
    );

    for (const previousTabId of previousNotebookTabIdsRef.current) {
      if (currentNotebookTabIds.has(previousTabId)) {
        continue;
      }

      void window.electronAPI.shutdownNotebookSession(previousTabId).catch(() => {
        // TODO: сохранить текущее поведение тихого завершения сессии.
      });
    }

    previousNotebookTabIdsRef.current = currentNotebookTabIds;
  }, [openedFiles]);

  useEffect(() => {
    if (!pendingCloseFile) {
      return;
    }

    const fileStillOpen = openedFiles.some((file) => file.tabId === pendingCloseFile.tabId);

    if (!fileStillOpen) {
      setPendingCloseFile(null);
    }
  }, [openedFiles, pendingCloseFile]);

  const beforeMount = useCallback((monacoInstance: typeof monaco) => {
    registerMonacoThemes(monacoInstance);
  }, []);

  const onMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }, []);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!activeFile || value === undefined) {
        return;
      }

      if (activeFile.kind === "cloud" && !activeFile.canWrite) {
        return;
      }

      dispatch(
        updateFileContent({
          tabId: activeFile.tabId,
          content: value,
        }),
      );
    },
    [activeFile, dispatch],
  );

  const handleCommitFileContent = useCallback(
    (tabId: string, nextContent: string) => {
      dispatch(
        updateFileContent({
          tabId,
          content: nextContent,
        }),
      );
    },
    [dispatch],
  );

  const handleMarkFileDirty = useCallback(
    (tabId: string, isDirty: boolean) => {
      if (isDirty) {
        return;
      }

      dispatch(markFileDirty(tabId));
    },
    [dispatch],
  );

  const handleSaveFileContent = useCallback(
    async (tabId: string, nextContent?: string) => {
      if (nextContent !== undefined) {
        const targetFile = openedFiles.find((file) => file.tabId === tabId);

        if (targetFile?.kind === "cloud" && !targetFile.canWrite) {
          throw new Error("У вас только доступ для чтения.");
        }

        dispatch(
          updateFileContent({
            tabId,
            content: nextContent,
          }),
        );
      }

      const result = await saveFileByTabId(tabId);

      if (!result.ok) {
        throw new Error(result.message ?? "Не удалось сохранить файл.");
      }
    },
    [dispatch, openedFiles, saveFileByTabId],
  );

  const handleRequestCloseFile = useCallback(
    (tabId: string) => {
      const file = openedFiles.find((openedFile) => openedFile.tabId === tabId);

      if (!file) {
        return;
      }

      if (!file.isDirty) {
        dispatch(closeFile(tabId));
        return;
      }

      setPendingCloseFile({
        tabId,
        fileName: file.name,
      });
    },
    [dispatch, openedFiles],
  );

  const handleCancelCloseFile = useCallback(() => {
    setPendingCloseFile(null);
  }, []);

  const handleConfirmCloseFile = useCallback(() => {
    if (!pendingCloseFile) {
      return;
    }

    const fileStillOpen = openedFiles.some((file) => file.tabId === pendingCloseFile.tabId);

    if (fileStillOpen) {
      dispatch(closeFile(pendingCloseFile.tabId));
    }

    setPendingCloseFile(null);
  }, [dispatch, openedFiles, pendingCloseFile]);

  const primaryEmptyState = !activeFile
    ? getWorkWindowEmptyStateContent({
        source,
        isAuthenticated,
        activeCloudProject,
        rootPath,
      })
    : null;

  if (primaryEmptyState) {
    return (
      <div className="min-h-0 flex-1 bg-editor">
        <EmptyEditorState
          title={primaryEmptyState.title}
          description={primaryEmptyState.description}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-editor">
      <WorkWindowTabs
        openedFiles={openedFiles}
        activeTabId={activeTabId}
        onActivate={(tabId) => dispatch(setActiveFile(tabId))}
        onRequestClose={handleRequestCloseFile}
      />

      <div className="min-h-0 flex-1 border-t border-default">
        {isCloudReadOnly ? (
          <div className="border-b border-default bg-panel px-4 py-2 text-sm text-secondary">
            У вас только доступ для чтения. Редактирование и сохранение отключены.
          </div>
        ) : null}

        {activeFile ? (
          isNotebookFile ? (
            <NotebookEditor
              key={activeFile.tabId}
              filePath={activeFile.editorPath}
              content={activeFile.content}
              isDirty={activeFile.isDirty}
              theme={theme}
              fontSize={visualSettings.fontSize}
              tabSize={visualSettings.tabSize}
              beforeMount={beforeMount}
              readOnly={isCloudReadOnly}
              runtimeContext={
                activeFile.kind === "local"
                  ? {
                      kind: "local" as const,
                      runtimeId: activeFile.tabId,
                      notebookPath: activeFile.path,
                      workspaceRootPath: rootPath,
                    }
                  : {
                      kind: "cloud" as const,
                      runtimeId: activeFile.tabId,
                      editorPath: activeFile.editorPath,
                      projectId: activeFile.projectId,
                      fileId: activeFile.fileId,
                      name: activeFile.name,
                    }
              }
              onCommitContent={(nextContent) =>
                handleCommitFileContent(activeFile.tabId, nextContent)
              }
              onMarkDirty={() => handleMarkFileDirty(activeFile.tabId, activeFile.isDirty)}
              onSaveContent={(nextContent) => handleSaveFileContent(activeFile.tabId, nextContent)}
            />
          ) : isMarkdownFile ? (
            <MarkdownEditor
              key={activeFile.tabId}
              filePath={activeFile.editorPath}
              content={activeFile.content}
              isDirty={activeFile.isDirty}
              theme={theme}
              fontSize={visualSettings.fontSize}
              tabSize={visualSettings.tabSize}
              beforeMount={beforeMount}
              readOnly={isCloudReadOnly}
              onCommitContent={(nextContent) =>
                handleCommitFileContent(activeFile.tabId, nextContent)
              }
              onMarkDirty={() => handleMarkFileDirty(activeFile.tabId, activeFile.isDirty)}
              onSaveContent={(nextContent) => handleSaveFileContent(activeFile.tabId, nextContent)}
            />
          ) : (
            <Editor
              path={activeFile.editorPath}
              height="100%"
              language={getEditorLanguage(activeFile.extension)}
              value={activeFile.content}
              onChange={handleEditorChange}
              beforeMount={beforeMount}
              onMount={onMount}
              theme={getMonacoThemeName(theme)}
              options={{
                minimap: { enabled: false },
                fontSize: visualSettings.fontSize,
                lineNumbers: "on",
                automaticLayout: true,
                readOnly: isCloudReadOnly,
                wordWrap: "off",
                scrollBeyondLastLine: true,
                smoothScrolling: true,
                renderWhitespace: "none",
                tabSize: visualSettings.tabSize,
                insertSpaces: true,
              }}
            />
          )
        ) : (
          <EmptyEditorState
            title="Выберите файл в проводнике"
            description="Откройте файл в боковой панели"
          />
        )}
      </div>

      {pendingCloseFile ? (
        <UnsavedFileCloseDialog
          fileName={pendingCloseFile.fileName}
          onConfirm={handleConfirmCloseFile}
          onCancel={handleCancelCloseFile}
        />
      ) : null}
    </div>
  );
}
