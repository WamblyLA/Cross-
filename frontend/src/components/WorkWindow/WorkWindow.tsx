import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useCallback, useEffect, useRef } from "react";
import { RxCross1 } from "react-icons/rx";
import { closeFile, setActiveFile, updateFileContent } from "../../features/files/filesSlice";
import { useDesktopActions } from "../../hooks/useDesktopActions";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { registerMonacoThemes } from "../../styles/monacoTheme";
import { getMonacoThemeName, type ThemeName } from "../../styles/tokens";

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

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

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

  if (!rootPath) {
    return (
      <div className="min-h-0 flex-1 bg-editor">
        <EmptyEditorState
          title="Откройте локальную папку"
          description="Открытие проекта начинается из верхнего меню File или по сочетанию Ctrl+O. После этого появятся проводник, редактор, кнопка Run и встроенный терминал."
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
                {file.isDirty ? <span className="text-warning text-xs">●</span> : null}
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
        ) : (
          <EmptyEditorState
            title="Выберите файл в проводнике"
            description="Откройте папку через File или по Ctrl+O, затем выберите файл в левой панели. Для запуска Python используйте кнопку Run или клавишу F5. Терминал открывается по Ctrl+J."
          />
        )}
      </div>
    </div>
  );
}
