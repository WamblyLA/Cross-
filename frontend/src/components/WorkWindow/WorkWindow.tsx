import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useCallback, useEffect, useRef } from "react";
import { RxCross1 } from "react-icons/rx";
import {
  closeFile,
  markFileDirty,
  markFileSaved,
  setActiveFile,
  updateFileContent,
} from "../../features/files/filesSlice";
import { useDesktopActions } from "../../hooks/useDesktopActions";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { registerMonacoThemes } from "../../styles/monacoTheme";
import { getMonacoThemeName, type ThemeName } from "../../styles/tokens";
import MarkdownEditor from "./MarkdownEditor";
import NotebookEditor from "./NotebookEditor";

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
        <div className="text-xs uppercase tracking-[0.22em] text-muted">Cross++ IDE</div>
        <h2 className="mt-3 text-xl text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
      </div>
    </div>
  );
}

export default function WorkWindow({ theme }: WorkWindowProps) {
  const dispatch = useAppDispatch();
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const { openedFiles, activeFilePath } = useAppSelector((state) => state.files);
  const activeFile = openedFiles.find((file) => file.path === activeFilePath) ?? null;
  const { saveActiveFile } = useDesktopActions();
  const isNotebookFile = activeFile?.extension?.toLowerCase() === "ipynb";
  const isMarkdownFile = activeFile?.extension?.toLowerCase() === "md";

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const notebookPathsRef = useRef<string[]>([]);

  const handleSave = useCallback(async () => {
    await saveActiveFile();
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
          path: activeFile.path,
          content: value,
        }),
      );
    },
    [activeFile, dispatch],
  );

  const handleCommitActiveFileContent = useCallback(
    (nextContent: string) => {
      if (!activeFile) {
        return;
      }

      dispatch(
        updateFileContent({
          path: activeFile.path,
          content: nextContent,
        }),
      );
    },
    [activeFile, dispatch],
  );

  const handleMarkActiveFileDirty = useCallback(() => {
    if (!activeFile || activeFile.isDirty) {
      return;
    }

    dispatch(markFileDirty(activeFile.path));
  }, [activeFile, dispatch]);

  const handleSaveActiveFileContent = useCallback(
    async (nextContent?: string) => {
      if (!activeFile) {
        return;
      }

      const contentToSave = nextContent ?? activeFile.content;

      if (nextContent !== undefined) {
        dispatch(
          updateFileContent({
            path: activeFile.path,
            content: contentToSave,
          }),
        );
      }

      await window.electronAPI.writeFile(activeFile.path, contentToSave);
      dispatch(markFileSaved(activeFile.path));
    },
    [activeFile, dispatch],
  );

  useEffect(() => {
    const currentNotebookPaths = openedFiles
      .filter((file) => file.extension?.toLowerCase() === "ipynb")
      .map((file) => file.path);
    const previousNotebookPaths = notebookPathsRef.current;
    const removedNotebookPaths = previousNotebookPaths.filter(
      (filePath) => !currentNotebookPaths.includes(filePath),
    );

    notebookPathsRef.current = currentNotebookPaths;

    removedNotebookPaths.forEach((filePath) => {
      void window.electronAPI.releaseNotebookKernel(filePath);
    });
  }, [openedFiles]);

  if (!rootPath) {
    return (
      <div className="min-h-0 flex-1 bg-editor">
        <EmptyEditorState
          title="Откройте локальную папку"
          description="Откройте проект через меню File или сочетанием Ctrl+O. После этого появятся проводник, редактор, кнопка Run и встроенный терминал."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 min-w-0 flex-col bg-editor">
      <div className="flex items-end overflow-x-auto border-b border-default bg-editor px-2 pt-2">
        {openedFiles.length > 0 ? (
          openedFiles.map((file) => (
            <div
              key={file.path}
              role="button"
              tabIndex={0}
              onClick={() => dispatch(setActiveFile(file.path))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  dispatch(setActiveFile(file.path));
                }
              }}
              className={`ui-tab flex items-center gap-2 px-3 py-2 ${
                activeFilePath === file.path ? "ui-tab-active" : ""
              }`}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span>{file.name}</span>
                {file.isDirty ? <span className="text-[11px] text-emerald-400">●</span> : null}
              </span>

              <button
                type="button"
                className="ui-control h-5 w-5 shrink-0"
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch(closeFile(file.path));
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
              filePath={activeFile.path}
              content={activeFile.content}
              isDirty={activeFile.isDirty}
              theme={theme}
              rootPath={rootPath}
              beforeMount={beforeMount}
              onCommitContent={handleCommitActiveFileContent}
              onMarkDirty={handleMarkActiveFileDirty}
              onSaveContent={handleSaveActiveFileContent}
            />
          ) : isMarkdownFile ? (
            <MarkdownEditor
              filePath={activeFile.path}
              content={activeFile.content}
              isDirty={activeFile.isDirty}
              theme={theme}
              beforeMount={beforeMount}
              onCommitContent={handleCommitActiveFileContent}
              onMarkDirty={handleMarkActiveFileDirty}
              onSaveContent={handleSaveActiveFileContent}
            />
          ) : (
            <Editor
              path={activeFile.path}
              height="100%"
              language={extToLang(activeFile.extension)}
              value={activeFile.content}
              onChange={handleEditorChange}
              beforeMount={beforeMount}
              onMount={onMount}
              theme={getMonacoThemeName(theme)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                automaticLayout: true,
                wordWrap: "off",
                scrollBeyondLastLine: true,
                smoothScrolling: true,
                renderWhitespace: "none",
                tabSize: 4,
                insertSpaces: true,
              }}
            />
          )
        ) : (
          <EmptyEditorState
            title="Выберите файл в проводнике"
            description="Откройте папку через File или Ctrl+O, затем выберите файл в левой панели. Для запуска Python используйте Run или F5, а терминал открывается по Ctrl+J."
          />
        )}
      </div>
    </div>
  );
}
