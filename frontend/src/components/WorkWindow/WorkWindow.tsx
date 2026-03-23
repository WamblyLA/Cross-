import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { RxCross1 } from "react-icons/rx";
import {
  closeFile,
  setActiveFile,
  updateFileContent,
} from "../../features/files/filesSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { applyMonacoTheme } from "../../styles/monacoTheme";
import { getMonacoThemeName, type ThemeName } from "../../styles/tokens";

type WorkWindowProps = {
  theme: ThemeName;
};

function extToLang(ext: string | null | undefined) {
  if (!ext) {
    return "plaintext";
  }

  const extL = ext.toLowerCase();

  switch (extL) {
    case "cpp":
      return "cpp";
    case "h":
      return "cpp";
    case "json":
      return "json";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

export default function WorkWindow({ theme }: WorkWindowProps) {
  const dispatch = useAppDispatch();
  const { openedFiles, activeFileId } = useAppSelector((state) => state.files);
  const activeFile = openedFiles.find((file) => file.id === activeFileId);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});

  const saveCurrentFile = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const currentFile = openedFiles.find((file) => file.id === activeFileId);
    if (!currentFile) {
      return;
    }

    const content = editor.getValue();

    dispatch(updateFileContent({ id: currentFile.id, content }));

    try {
      await window.electronAPI.writeFile(currentFile.id, content);

      setDirtyMap((prev) => ({
        ...prev,
        [currentFile.id]: false,
      }));

      console.log("Сохранилось", currentFile.id);
    } catch (err) {
      console.error("Ошибка при сохранении файла", err);
    }
  }, [activeFileId, openedFiles, dispatch]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const editor = editorRef.current;

    const disposable = editor.addAction({
      id: "save-file",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: async () => {
        await saveCurrentFile();
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [saveCurrentFile]);

  const onMount = useCallback(
    (
      editor: monaco.editor.IStandaloneCodeEditor,
      monacoInstance: typeof monaco,
    ) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;
      applyMonacoTheme(monacoInstance, theme);
      monacoInstance.editor.setTheme(getMonacoThemeName(theme));
    },
    [theme],
  );

  const beforeMount = useCallback(
    (monacoInstance: typeof monaco) => {
      applyMonacoTheme(monacoInstance, theme);
    },
    [theme],
  );

  const editorChange = useCallback(
    (value: string | undefined) => {
      if (!activeFile || value === undefined) {
        return;
      }

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        dispatch(updateFileContent({ id: activeFile.id, content: value }));

        setDirtyMap((prev) => ({
          ...prev,
          [activeFile.id]: true,
        }));
      }, 150);
    },
    [activeFile, dispatch],
  );

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }

    applyMonacoTheme(monacoRef.current, theme);
    monacoRef.current.editor.setTheme(getMonacoThemeName(theme));
  }, [theme]);

  useEffect(() => {
    const existingIds = new Set(openedFiles.map((file) => file.id));

    setDirtyMap((prev) => {
      const next: Record<string, boolean> = {};

      for (const key of Object.keys(prev)) {
        if (existingIds.has(key)) {
          next[key] = prev[key];
        }
      }

      return next;
    });
  }, [openedFiles]);

  if (openedFiles.length === 0) {
    return <div className="flex-1 bg-editor" />;
  }

  return (
    <div className="w-full h-full flex flex-col bg-editor min-w-0">
      <div className="flex items-end px-2 pt-2 border-b border-default bg-editor overflow-x-auto">
        {openedFiles.map((file) => (
          <div
            key={file.id}
            role="button"
            tabIndex={0}
            onClick={() => dispatch(setActiveFile(file.id))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                dispatch(setActiveFile(file.id));
              }
            }}
            className={`ui-tab px-3 py-2 flex gap-2 items-center ${
              activeFileId === file.id ? "ui-tab-active border-b-editor" : ""
            }`}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span>
                {file.name}
                {file.extencion ? `.${file.extencion}` : ""}
              </span>

              {dirtyMap[file.id] ? (
                <span className="text-warning text-sm leading-none">●</span>
              ) : null}
            </span>

            <button
              type="button"
              className="ui-control h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(closeFile(file.id));
              }}
            >
              <RxCross1 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 border-t border-default">
        {activeFile ? (
          <Editor
            height="100%"
            language={extToLang(activeFile.extencion)}
            value={activeFile.content}
            onChange={editorChange}
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
        ) : null}
      </div>
    </div>
  );
}
