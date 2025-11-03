import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useRef, useCallback, useEffect } from "react";
import {
  closeFile,
  setActiveFile,
  updateFileContent,
} from "../../features/files/filesSlice";
import { RxCross1 } from "react-icons/rx";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useRequest } from "../../hooks/useRequest";
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
  const ref = useRef<number | null>(null);
  const { refetch: saveFile } = useRequest({
    url: "http://localhost:3000/api/files/save",
    auto: false,
    method: "POST",
  });
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const editor = editorRef.current;
    const idshnik = editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
        if (!editorRef.current) {
          return;
        }
        const content = editorRef.current.getValue();
        const nowActiveFile = openedFiles.find((file) => file.id === activeFileId);
        if (!nowActiveFile) {
          return;
        }
        dispatch(updateFileContent({id: nowActiveFile.id, content}));
        try {
          const data = await saveFile({
            method: "POST",
            body: {path: nowActiveFile.id, content}
          })
          if (data.success) {
            console.log("Сохранилось", nowActiveFile.id);
          }
    } catch (err) {
          console.error("Ошибка при сохранении файла", err);
        }
      }
    )
  }, [activeFileId, openedFiles, saveFile, dispatch])
  const fileSave = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monaco) => {
    editorRef.current = editor;
  }, [])
  const before = useCallback((monaco) => {
    monaco.editor.defineTheme(
      "defaultDark",
      {
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
      },
      []
    );
  }, []);
  const editorChange = useCallback(
    (value: string | undefined) => {
      if (!activeFile || value === undefined) {
        return null;
      }
      if (ref.current) {
        window.clearTimeout(ref.current);
      }
      ref.current = window.setTimeout(() => {
        if (activeFile) {
          dispatch(updateFileContent({ id: activeFile.id, content: value }));
        }
      }, 300);
    },
    [activeFile, dispatch]
  );
  if (openedFiles.length === 0) return null;
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
            <span>
              {f.name}.{f.extencion}
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
            onMount={(editor, monaco) => fileSave(editor, monaco)}
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
