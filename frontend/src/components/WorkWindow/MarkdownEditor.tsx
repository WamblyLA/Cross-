import { Editor } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { VscCode, VscEye, VscSplitHorizontal } from "react-icons/vsc";
import { getMonacoThemeName, type ThemeName } from "../../styles/tokens";
import ResizeableBlock from "../../ui/ResizeableBlock";
import { createDevLogger } from "../../utils/devLogger";
import MarkdownRenderer from "./markdown/MarkdownRenderer";

type MarkdownViewMode = "code" | "split" | "preview";

type MarkdownEditorProps = {
  filePath: string;
  content: string;
  isDirty: boolean;
  theme: ThemeName;
  beforeMount: (monaco: typeof Monaco) => void;
  onCommitContent: (nextContent: string) => void;
  onMarkDirty: () => void;
  onSaveContent: (nextContent: string) => Promise<void>;
};

const logger = createDevLogger("crosspp:markdown");

function MarkdownPreviewPane({
  source,
  filePath,
}: {
  source: string;
  filePath: string;
}) {
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <MarkdownRenderer source={source} filePath={filePath} />
    </div>
  );
}

export default function MarkdownEditor({
  filePath,
  content,
  isDirty,
  theme,
  beforeMount,
  onCommitContent,
  onMarkDirty,
  onSaveContent,
}: MarkdownEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const lastFilePathRef = useRef(filePath);
  const lastCommittedContentRef = useRef(content);
  const latestDraftContentRef = useRef(content);
  const dirtyNotifiedRef = useRef(isDirty);

  const [draftContent, setDraftContent] = useState(content);
  const [viewMode, setViewMode] = useState<MarkdownViewMode>("split");
  const deferredContent = useDeferredValue(draftContent);

  useEffect(() => {
    dirtyNotifiedRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    latestDraftContentRef.current = draftContent;
  }, [draftContent]);

  useEffect(() => {
    if (filePath !== lastFilePathRef.current) {
      lastFilePathRef.current = filePath;
      lastCommittedContentRef.current = content;
      dirtyNotifiedRef.current = isDirty;
      setDraftContent(content);
      logger.info("Открыт новый Markdown-файл.", { filePath });
      return;
    }

    if (content !== lastCommittedContentRef.current) {
      lastCommittedContentRef.current = content;
      dirtyNotifiedRef.current = isDirty;
      setDraftContent(content);
    }
  }, [content, filePath, isDirty]);

  const commitDraft = useCallback(() => {
    if (draftContent === lastCommittedContentRef.current) {
      return draftContent;
    }

    lastCommittedContentRef.current = draftContent;
    onCommitContent(draftContent);
    return draftContent;
  }, [draftContent, onCommitContent]);

  const saveDraft = useCallback(async () => {
    const nextContent = commitDraft();
    await onSaveContent(nextContent);
    dirtyNotifiedRef.current = false;
    logger.info("Markdown-файл сохранён.", { filePath });
  }, [commitDraft, filePath, onSaveContent]);

  useEffect(() => {
    return () => {
      if (latestDraftContentRef.current !== lastCommittedContentRef.current) {
        onCommitContent(latestDraftContentRef.current);
      }
    };
  }, [onCommitContent]);

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof Monaco) => {
      editorRef.current = editor;

      editor.addAction({
        id: "markdown-save-file",
        label: "Сохранить файл",
        keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
        run: async () => {
          await saveDraft();
        },
      });
    },
    [saveDraft],
  );

  useEffect(() => {
    if (viewMode === "preview") {
      return;
    }

    const animationId = window.requestAnimationFrame(() => {
      editorRef.current?.layout();
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [viewMode]);

  const handleDraftChange = useCallback(
    (nextValue: string) => {
      setDraftContent(nextValue);

      if (!dirtyNotifiedRef.current) {
        dirtyNotifiedRef.current = true;
        onMarkDirty();
      }
    },
    [onMarkDirty],
  );

  const editorPane = (
    <Editor
      path={filePath}
      height="100%"
      language="markdown"
      value={draftContent}
      onChange={(value) => handleDraftChange(value ?? "")}
      beforeMount={beforeMount}
      onMount={handleMount}
      theme={getMonacoThemeName(theme)}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        automaticLayout: true,
        wordWrap: "on",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderWhitespace: "selection",
        tabSize: 2,
        insertSpaces: true,
        padding: {
          top: 16,
          bottom: 18,
        },
      }}
    />
  );

  const previewPane = (
    <div className="h-full min-h-0 bg-panel">
      <MarkdownPreviewPane source={deferredContent} filePath={filePath} />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-default bg-panel px-4 py-3">
        <div>
          <div className="text-sm text-primary">Редактор Markdown</div>
          <div className="text-xs text-muted">Предпросмотр обновляется на лету во время ввода.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`ui-control h-9 px-3 ${viewMode === "code" ? "border-default bg-editor text-primary" : ""}`}
            onClick={() => setViewMode("code")}
          >
            <VscCode className="h-4 w-4" />
            <span>Code</span>
          </button>

          <button
            type="button"
            className={`ui-control h-9 px-3 ${viewMode === "split" ? "border-default bg-editor text-primary" : ""}`}
            onClick={() => setViewMode("split")}
          >
            <VscSplitHorizontal className="h-4 w-4" />
            <span>Split</span>
          </button>

          <button
            type="button"
            className={`ui-control h-9 px-3 ${viewMode === "preview" ? "border-default bg-editor text-primary" : ""}`}
            onClick={() => setViewMode("preview")}
          >
            <VscEye className="h-4 w-4" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {viewMode === "code" ? (
          editorPane
        ) : viewMode === "preview" ? (
          previewPane
        ) : (
          <div className="flex h-full min-h-0">
            <div className="min-w-0 flex-1">{editorPane}</div>

            <ResizeableBlock minWidth={280} maxWidth={900} defaultWidth={520} direction="l">
              <div className="h-full min-h-0 border-l border-default bg-panel">{previewPane}</div>
            </ResizeableBlock>
          </div>
        )}
      </div>
    </div>
  );
}
