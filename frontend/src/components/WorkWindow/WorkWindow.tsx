import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useRef, useCallback, useEffect, useState } from "react";
import {
  closeFile,
  setActiveFile,
  updateFileContent,
} from "../../features/files/filesSlice";
import { RxCross1 } from "react-icons/rx";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

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

export default function WorkWindow() {
  const dispatch = useAppDispatch();
  const { openedFiles, activeFileId } = useAppSelector((state) => state.files);
  const activeFile = openedFiles.find((file) => file.id === activeFileId);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
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

  const onMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }, []);

  const before = useCallback((monacoInstance: typeof monaco) => {
    monacoInstance.editor.defineTheme("defaultDark", {
      base: "hc-black",
      inherit: true,
      colors: {
        "editor.background": "#0F1710",
        "editor.lineHighlightBackground": "#101a11",
        "editor.selectionBackground": "#3b5933",
        "editorLineNumber.foreground": "#e1fae3",
      },
      rules: [
        { token: "comment", foreground: "#324734", fontStyle: "italic" },
        { token: "keyword", foreground: "#b0550b", fontStyle: "bold" },
        { token: "string", foreground: "#24a616" },
        { token: "number", foreground: "#1a76bd" },
        { token: "function", foreground: "#10e843" },
      ],
    });
  }, []);

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
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex">
        {openedFiles.map((f) => (
          <div
            key={f.id}
            onClick={() => dispatch(setActiveFile(f.id))}
            className={`${
              activeFileId === f.id ? "border-b-2 border-lines-color" : ""
            } px-2 py-1 flex gap-2 items-center`}
          >
            <span className="flex items-center gap-2">
              <span>
                {f.name}
                {f.extencion ? `.${f.extencion}` : ""}
              </span>

              {dirtyMap[f.id] ? (
                <span className="text-white text-sm leading-none">●</span>
              ) : null}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch(closeFile(f.id));
              }}
            >
              <RxCross1 />
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1">
        {activeFile ? (
          <Editor
            height="100%"
            language={extToLang(activeFile.extencion)}
            value={activeFile.content}
            onChange={editorChange}
            beforeMount={before}
            onMount={onMount}
            theme="defaultDark"
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
