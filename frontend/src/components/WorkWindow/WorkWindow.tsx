import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { RxCross1 } from "react-icons/rx";
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

type WorkWindowProps = {
  theme: ThemeName;
};

function extToLang(extension: string | null | undefined) {
  if (!extension) {
    return "plaintext";
  }

  switch (extension.toLowerCase()) {
    case "py":
      return "python";
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
      return "cpp";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "html":
      return "html";
    case "css":
      return "css";
    default:
      return "plaintext";
  }
}

function EmptyEditorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-lg rounded-2xl border border-default bg-panel px-6 py-8 text-center shadow-sm">
        <div className="ui-brand-mark">Cross++ IDE</div>
        <h2 className="mt-3 text-xl text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
      </div>
    </div>
  );
}

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
        // TODO
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

  const handleSaveActiveFileContent = useCallback(
    async (nextContent?: string) => {
      if (!activeFile) {
        return;
      }

      if (nextContent !== undefined) {
        dispatch(
          updateFileContent({
            tabId: activeFile.tabId,
            content: nextContent,
          }),
        );
      }

      const result = await saveActiveFile();

      if (!result.ok) {
        throw new Error(result.message ?? "Не удалось сохранить файл.");
      }
    },
    [activeFile, dispatch, saveActiveFile],
  );
  void handleSaveActiveFileContent;

  const handleSaveFileContent = useCallback(
    async (tabId: string, nextContent?: string) => {
      if (nextContent !== undefined) {
        dispatch(
          updateFileContent({
            tabId,
            content: nextContent,
          }),
        );
      }

      const result = await saveFileByTabId(tabId);

      if (!result.ok) {
        throw new Error(result.message ?? "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ С„Р°Р№Р».");
      }
    },
    [dispatch, saveFileByTabId],
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

  if (!activeFile) {
    if (source === "cloud") {
      if (!isAuthenticated) {
        return (
          <div className="min-h-0 flex-1 bg-editor">
            <EmptyEditorState
              title="Облако доступно после входа"
              description="Войдите в аккаунт, чтобы открывать облачные проекты, редактировать файлы и сохранять изменения"
            />
          </div>
        );
      }

      if (!activeCloudProject) {
        return (
          <div className="min-h-0 flex-1 bg-editor">
            <EmptyEditorState
              title="Выберите облачный проект"
              description="Откройте проект в облачном проводнике слева или создайте новый. После этого список файлов появится"
            />
          </div>
        );
      }

      return (
        <div className="min-h-0 flex-1 bg-editor">
          <EmptyEditorState
            title="Выберите файл облачного проекта"
            description={`Выберите файл в облачном проводнике или создайте новый файл внутри проекта`}
          />
        </div>
      );
    }

    if (!rootPath) {
      return (
        <div className="min-h-0 flex-1 bg-editor">
          <EmptyEditorState
            title="Откройте локальную папку"
            description="Откройте проект через меню Файл или сочетанием Ctrl+O"
          />
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-editor">
      <div className="ui-scrollbar-x flex items-end overflow-x-auto border-b border-default bg-editor px-2 pt-2">
        {openedFiles.length > 0 ? (
          openedFiles.map((file) => (
            <div
              key={file.tabId}
              role="button"
              tabIndex={0}
              onClick={() => dispatch(setActiveFile(file.tabId))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  dispatch(setActiveFile(file.tabId));
                }
              }}
              className={`ui-tab flex items-center gap-2 px-3 py-2 ${
                activeTabId === file.tabId ? "ui-tab-active" : ""
              }`}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span>{file.name}</span>
                {file.kind === "cloud" ? (
                  <span className="rounded-full border border-default px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted">
                    Облако
                  </span>
                ) : null}
                {file.isDirty ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}
              </span>

              <button
                type="button"
                className="ui-control h-5 w-5 shrink-0"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRequestCloseFile(file.tabId);
                }}
                title="Закрыть файл"
              >
                <RxCross1 className="h-3 w-3" />
              </button>
            </div>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-muted">Файлы пока не открыты</div>
        )}
      </div>

      <div className="min-h-0 flex-1 border-t border-default">
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
              language={extToLang(activeFile.extension)}
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
