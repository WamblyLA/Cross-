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
  const syncHeightRef = useRef<(() => void) | null>(null);
  const suppressOnChangeRef = useRef(false);
  const isFocusedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onSaveRequestRef = useRef(onSaveRequest);
  const onRunRequestRef = useRef(onRunRequest);
  const onRunAndAdvanceRequestRef = useRef(onRunAndAdvanceRequest);
  const onFocusRequestRef = useRef(onFocusRequest);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
        const nextHeight = Math.max(minHeight, Math.min(editor.getContentHeight() + 2, 640));
        setHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
      };

      syncHeightRef.current = syncHeight;
      syncHeight();

      disposablesRef.current = [
        editor.onDidContentSizeChange(syncHeight),
        editor.onDidFocusEditorWidget(() => {
          isFocusedRef.current = true;
          onFocusRequestRef.current?.();
        }),
        editor.onDidBlurEditorWidget(() => {
          isFocusedRef.current = false;
        }),
        editor.addAction({
          id: `${editorPath}-save`,
          label: "Сохранить файл",
          keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
          run: async () => {
            if (!readOnly) {
              await onSaveRequestRef.current();
            }
          },
        }),
        editor.addAction({
          id: `${editorPath}-run`,
          label: "Выполнить ячейку",
          keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter],
          run: () => {
            if (!readOnly) {
              onRunRequestRef.current?.();
            }
          },
        }),
        editor.addAction({
          id: `${editorPath}-run-and-advance`,
          label: "Выполнить и перейти к следующей ячейке",
          keybindings: [monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Enter],
          run: () => {
            if (!readOnly) {
              onRunAndAdvanceRequestRef.current?.();
            }
          },
        }),
      ];
    },
    [editorPath, minHeight, readOnly],
  );

  useEffect(() => {
    return () => {
      editorRef.current = null;
      syncHeightRef.current = null;
      isFocusedRef.current = false;

      for (const disposable of disposablesRef.current) {
        disposable.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    if (editor.getValue() === value) {
      return;
    }

    if (!readOnly && isFocusedRef.current) {
      return;
    }

    suppressOnChangeRef.current = true;

    try {
      const model = editor.getModel();

      if (model) {
        editor.executeEdits("external-sync", [
          {
            range: model.getFullModelRange(),
            text: value,
            forceMoveMarkers: true,
          },
        ]);
        editor.pushUndoStop();
      } else {
        editor.setValue(value);
      }
      syncHeightRef.current?.();
    } finally {
      suppressOnChangeRef.current = false;
    }
  }, [readOnly, value]);

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
      defaultValue={value}
      onChange={(nextValue) => {
        if (suppressOnChangeRef.current) {
          return;
        }

        onChangeRef.current(nextValue ?? "");
      }}
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
        lineDecorationsWidth: lineNumbers === "off" ? 6 : 12,
        lineNumbersMinChars: lineNumbers === "off" ? 0 : 2,
        padding: {
          top: 8,
          bottom: 8,
        },
      }}
    />
  );
}
