import { Editor } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMonacoThemeName, type ThemeName } from "../../styles/tokens";

type NotebookSourceEditorProps = {
  editorPath: string;
  language: "python" | "markdown";
  value: string;
  theme: ThemeName;
  beforeMount: (monaco: typeof Monaco) => void;
  onChange: (nextValue: string) => void;
  onSaveRequest: () => Promise<void>;
  onRun?: () => void;
  onRunAndAdvance?: () => void;
  onFocus?: () => void;
  onRegisterEditor?: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
  lineNumbers: "on" | "off";
  minHeight: number;
  tabSize: number;
};

export default function NotebookSourceEditor({
  editorPath,
  language,
  value,
  theme,
  beforeMount,
  onChange,
  onSaveRequest,
  onRun,
  onRunAndAdvance,
  onFocus,
  onRegisterEditor,
  lineNumbers,
  minHeight,
  tabSize,
}: NotebookSourceEditorProps) {
  const [height, setHeight] = useState(minHeight);
  const disposablesRef = useRef<Monaco.IDisposable[]>([]);
  const onSaveRequestRef = useRef(onSaveRequest);
  const onRunRef = useRef(onRun);
  const onRunAndAdvanceRef = useRef(onRunAndAdvance);
  const onFocusRef = useRef(onFocus);
  const onRegisterEditorRef = useRef(onRegisterEditor);

  useEffect(() => {
    onSaveRequestRef.current = onSaveRequest;
  }, [onSaveRequest]);

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  useEffect(() => {
    onRunAndAdvanceRef.current = onRunAndAdvance;
  }, [onRunAndAdvance]);

  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    onRegisterEditorRef.current = onRegisterEditor;
  }, [onRegisterEditor]);

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof Monaco) => {
      onRegisterEditorRef.current?.(editor);

      const syncHeight = () => {
        setHeight(Math.max(minHeight, Math.min(editor.getContentHeight() + 4, 720)));
      };

      syncHeight();

      disposablesRef.current = [
        editor.onDidContentSizeChange(syncHeight),
        editor.onDidFocusEditorWidget(() => onFocusRef.current?.()),
        editor.addAction({
          id: `${editorPath}-save`,
          label: "Сохранить файл",
          keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
          run: async () => onSaveRequestRef.current(),
        }),
      ];

      if (onRun) {
        disposablesRef.current.push(
          editor.addAction({
            id: `${editorPath}-run`,
            label: "Выполнить ячейку",
            keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter],
            run: () => onRunRef.current?.(),
          }),
        );
      }

      if (onRunAndAdvance) {
        disposablesRef.current.push(
          editor.addAction({
            id: `${editorPath}-run-next`,
            label: "Выполнить ячейку и перейти дальше",
            keybindings: [monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Enter],
            run: () => onRunAndAdvanceRef.current?.(),
          }),
        );
      }
    },
    [editorPath, minHeight, onRun, onRunAndAdvance],
  );

  useEffect(() => {
    return () => {
      for (const disposable of disposablesRef.current) {
        disposable.dispose();
      }
      onRegisterEditorRef.current?.(null);
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
