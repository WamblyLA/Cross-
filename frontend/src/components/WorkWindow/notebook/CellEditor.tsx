import { Editor } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMonacoThemeName, type ThemeName } from "../../../styles/tokens";

type CellEditorProps = {
  editorPath: string;
  language: string;
  value: string;
  theme: ThemeName;
  fontSize: number;
  beforeMount: (monaco: typeof Monaco) => void;
  onChange: (nextValue: string) => void;
  onSaveRequest: () => Promise<void>;
  lineNumbers: "on" | "off";
  minHeight: number;
  tabSize: number;
  readOnly?: boolean;
  focusToken?: number;
  onRunRequest?: () => void;
  onRunAndAdvanceRequest?: () => void;
  onFocusRequest?: () => void;
};

export default function CellEditor({
  editorPath,
  language,
  value,
  theme,
  fontSize,
  beforeMount,
  onChange,
  onSaveRequest,
  lineNumbers,
  minHeight,
  tabSize,
  readOnly = false,
  focusToken = 0,
  onRunRequest,
  onRunAndAdvanceRequest,
  onFocusRequest,
}: CellEditorProps) {
  const [height, setHeight] = useState(minHeight);
  const disposablesRef = useRef<Monaco.IDisposable[]>([]);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const onSaveRequestRef = useRef(onSaveRequest);
  const onRunRequestRef = useRef(onRunRequest);
  const onRunAndAdvanceRequestRef = useRef(onRunAndAdvanceRequest);
  const onFocusRequestRef = useRef(onFocusRequest);

  useEffect(() => {
    onSaveRequestRef.current = onSaveRequest;
  }, [onSaveRequest]);

  useEffect(() => {
    onRunRequestRef.current = onRunRequest;
  }, [onRunRequest]);

  useEffect(() => {
    onRunAndAdvanceRequestRef.current = onRunAndAdvanceRequest;
  }, [onRunAndAdvanceRequest]);

  useEffect(() => {
    onFocusRequestRef.current = onFocusRequest;
  }, [onFocusRequest]);

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof Monaco) => {
      editorRef.current = editor;

      const syncHeight = () => {
        const nextHeight = Math.max(minHeight, Math.min(editor.getContentHeight() + 4, 720));
        setHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
      };

      syncHeight();

      disposablesRef.current = [
        editor.onDidContentSizeChange(syncHeight),
        editor.onDidFocusEditorWidget(() => {
          onFocusRequestRef.current?.();
        }),
        editor.addAction({
          id: `${editorPath}-save`,
          label: "Сохранить файл",
          keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
          run: async () => onSaveRequestRef.current(),
        }),
        editor.addAction({
          id: `${editorPath}-run`,
          label: "Выполнить ячейку",
          keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter],
          run: () => {
            onRunRequestRef.current?.();
          },
        }),
        editor.addAction({
          id: `${editorPath}-run-and-advance`,
          label: "Выполнить и перейти к следующей ячейке",
          keybindings: [monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Enter],
          run: () => {
            onRunAndAdvanceRequestRef.current?.();
          },
        }),
      ];
    },
    [editorPath, minHeight],
  );

  useEffect(() => {
    return () => {
      editorRef.current = null;

      for (const disposable of disposablesRef.current) {
        disposable.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!focusToken) {
      return;
    }

    editorRef.current?.focus();
  }, [focusToken]);

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
        fontSize,
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
