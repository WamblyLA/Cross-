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
  readOnly?: boolean;
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
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
    <div className="ui-scrollbar h-full overflow-y-auto px-6 py-5">
      <MarkdownRenderer source={source} filePath={filePath} />
    </div>
  );
}

export default function MarkdownEditor({
  filePath,
  content,
  isDirty,
  readOnly = false,
  theme,
  fontSize,
  tabSize,
  beforeMount,
  onCommitContent,
  onMarkDirty,
  onSaveContent,
}: MarkdownEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const lastFilePathRef = useRef(filePath);
  const lastSyncedContentRef = useRef(content);
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

  const syncDraftFromExternalContent = useCallback((nextContent: string, dirtyState: boolean) => {
    lastSyncedContentRef.current = nextContent;
    dirtyNotifiedRef.current = dirtyState;
    setDraftContent(nextContent);
  }, []);

  useEffect(() => {
    if (filePath !== lastFilePathRef.current) {
      lastFilePathRef.current = filePath;
      syncDraftFromExternalContent(content, isDirty);
      logger.info("Открыт новый Markdown-файл.", { filePath });
      return;
    }

    if (!dirtyNotifiedRef.current && content !== lastSyncedContentRef.current) {
      syncDraftFromExternalContent(content, isDirty);
    }
  }, [content, filePath, isDirty, syncDraftFromExternalContent]);

  const commitDraft = useCallback(
    (nextContent = latestDraftContentRef.current) => {
      if (nextContent === lastSyncedContentRef.current) {
        return nextContent;
      }

      lastSyncedContentRef.current = nextContent;
      onCommitContent(nextContent);
      return nextContent;
    },
    [onCommitContent],
  );

  const saveDraft = useCallback(async () => {
    if (readOnly) {
      return;
    }

    const nextContent = commitDraft();
    await onSaveContent(nextContent);
    syncDraftFromExternalContent(nextContent, false);
    logger.info("Markdown-файл сохранён.", { filePath });
  }, [commitDraft, filePath, onSaveContent, readOnly, syncDraftFromExternalContent]);

  useEffect(() => {
    return () => {
      if (latestDraftContentRef.current !== lastSyncedContentRef.current) {
        commitDraft(latestDraftContentRef.current);
      }
    };
  }, [commitDraft]);

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof Monaco) => {
      editorRef.current = editor;

      editor.addAction({
        id: "markdown-save-file",
        label: "Сохранить файл",
        keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
        run: async () => {
          if (!readOnly) {
            await saveDraft();
          }
        },
      });
    },
    [readOnly, saveDraft],
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
      if (readOnly) {
        return;
      }

      setDraftContent(nextValue);

      if (nextValue !== lastSyncedContentRef.current && !dirtyNotifiedRef.current) {
        dirtyNotifiedRef.current = true;
        onMarkDirty();
      }
    },
    [onMarkDirty, readOnly],
  );

  const handleViewModeChange = useCallback(
    (nextMode: MarkdownViewMode) => {
      if (nextMode === viewMode) {
        return;
      }

      commitDraft();
      setViewMode(nextMode);
    },
    [commitDraft, viewMode],
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
        fontSize,
        lineNumbers: "on",
        automaticLayout: true,
        readOnly,
        wordWrap: "on",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderWhitespace: "selection",
        tabSize,
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
          <div className="text-sm text-primary">
            {readOnly ? "Редактор Markdown (только чтение)" : "Редактор Markdown"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`ui-control h-9 px-3 ${viewMode === "code" ? "border-default bg-editor text-primary" : ""}`}
            onClick={() => handleViewModeChange("code")}
          >
            <VscCode className="h-4 w-4" />
            <span>Код</span>
          </button>

          <button
            type="button"
            className={`ui-control h-9 px-3 ${viewMode === "split" ? "border-default bg-editor text-primary" : ""}`}
            onClick={() => handleViewModeChange("split")}
          >
            <VscSplitHorizontal className="h-4 w-4" />
            <span>Разделить</span>
          </button>

          <button
            type="button"
            className={`ui-control h-9 px-3 ${viewMode === "preview" ? "border-default bg-editor text-primary" : ""}`}
            onClick={() => handleViewModeChange("preview")}
          >
            <VscEye className="h-4 w-4" />
            <span>Предпросмотр</span>
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

            <ResizeableBlock minSize={280} maxSize={900} defaultSize={520} direction="l">
              <div className="h-full min-h-0 border-l border-default bg-panel">{previewPane}</div>
            </ResizeableBlock>
          </div>
        )}
      </div>
    </div>
  );
}
