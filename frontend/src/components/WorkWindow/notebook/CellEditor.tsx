import { Editor } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMonacoThemeName, type ThemeName } from "../../../styles/tokens";

type CellEditorProps = {
  editorPath: string;
  language: string;
  value: string;
  theme: ThemeName;
  beforeMount: (monaco: typeof Monaco) => void;
  onChange: (nextValue: string) => void;
  onSaveRequest: () => Promise<void>;
  lineNumbers: "on" | "off";
  minHeight: number;
  tabSize: number;
  readOnly?: boolean;
};

export default function CellEditor({
  editorPath,
  language,
  value,
  theme,
  beforeMount,
  onChange,
  onSaveRequest,
  lineNumbers,
  minHeight,
  tabSize,
  readOnly = false,
}: CellEditorProps) {
  const [height, setHeight] = useState(minHeight);
  const disposablesRef = useRef<Monaco.IDisposable[]>([]);
  const onSaveRequestRef = useRef(onSaveRequest);

  useEffect(() => {
    onSaveRequestRef.current = onSaveRequest;
  }, [onSaveRequest]);

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof Monaco) => {
      const syncHeight = () => {
        setHeight(Math.max(minHeight, Math.min(editor.getContentHeight() + 4, 720)));
      };

      syncHeight();

      disposablesRef.current = [
        editor.onDidContentSizeChange(syncHeight),
        editor.addAction({
          id: `${editorPath}-save`,
          label: "Сохранить файл",
          keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
          run: async () => onSaveRequestRef.current(),
        }),
      ];
    },
    [editorPath, minHeight],
  );

  useEffect(() => {
    return () => {
      for (const disposable of disposablesRef.current) {
        disposable.dispose();
      }
    };
  }, []);

  return (
    <Editor
      path={editorPath}
      height={`${height}px`}
      language={language}
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      beforeMount={beforeMount}
      onMount={handleMount}
      theme={getMonacoThemeName(theme)}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        wordWrap: "on",
        tabSize,
        insertSpaces: true,
        glyphMargin: false,
        folding: false,
        readOnly,
        lineDecorationsWidth: lineNumbers === "off" ? 8 : 16,
        lineNumbersMinChars: lineNumbers === "off" ? 0 : 3,
        padding: {
          top: 14,
          bottom: 14,
        },
      }}
    />
  );
}
