import type * as Monaco from "monaco-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VscAdd } from "react-icons/vsc";
import { type ThemeName } from "../../../styles/tokens";
import {
  addNotebookCell,
  createNotebookDocumentWithStarterCell,
  deleteNotebookCell,
  moveNotebookCell,
  setNotebookCellMode,
  updateNotebookCellSource,
} from "./notebookDocument";
import { resolveNotebookCodeCellLanguage } from "./notebookLanguage";
import { parseNotebookContent, serializeNotebookDocument } from "./notebookPersistence";
import CellList from "./CellList";
import NotebookToolbar from "./NotebookToolbar";
import type { EditableNotebookCellType, NotebookDocumentModel } from "./types";

type NotebookEditorHostProps = {
  filePath: string;
  content: string;
  isDirty: boolean;
  theme: ThemeName;
  beforeMount: (monaco: typeof Monaco) => void;
  onCommitContent: (nextContent: string) => void;
  onMarkDirty: () => void;
  onSaveContent: (nextContent: string) => Promise<void>;
};

type CommitOptions = {
  markDirty?: boolean;
};

export default function NotebookEditorHost({
  filePath,
  content,
  isDirty,
  theme,
  beforeMount,
  onCommitContent,
  onMarkDirty,
  onSaveContent,
}: NotebookEditorHostProps) {
  const initialParsedRef = useRef<ReturnType<typeof parseNotebookContent> | null>(null);

  if (initialParsedRef.current === null) {
    initialParsedRef.current = parseNotebookContent(content);
  }

  const [document, setDocument] = useState<NotebookDocumentModel>(
    () => initialParsedRef.current?.document ?? createNotebookDocumentWithStarterCell("code"),
  );
  const [parseError, setParseError] = useState<string | null>(
    () => initialParsedRef.current?.parseError ?? null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const documentRef = useRef(document);
  const lastFilePathRef = useRef(filePath);
  const lastCommittedContentRef = useRef(content);
  const dirtyNotifiedRef = useRef(isDirty);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const applyParsedNotebook = useCallback((nextContent: string, dirtyState: boolean) => {
    const parsed = parseNotebookContent(nextContent);

    documentRef.current = parsed.document;
    dirtyNotifiedRef.current = dirtyState;

    setDocument(parsed.document);
    setParseError(parsed.parseError);
    setStatusMessage(parsed.parseError ? "В ноутбуке некорректный JSON." : null);
  }, []);

  useEffect(() => {
    if (filePath !== lastFilePathRef.current || content !== lastCommittedContentRef.current) {
      lastFilePathRef.current = filePath;
      lastCommittedContentRef.current = content;
      applyParsedNotebook(content, isDirty);
      return;
    }

    dirtyNotifiedRef.current = isDirty;
  }, [applyParsedNotebook, content, filePath, isDirty]);

  const commitDocument = useCallback(
    (nextDocument: NotebookDocumentModel, options: CommitOptions = {}) => {
      const { markDirty = true } = options;
      const serialized = serializeNotebookDocument(nextDocument);

      documentRef.current = nextDocument;
      lastCommittedContentRef.current = serialized;

      setDocument(nextDocument);
      setParseError(null);
      onCommitContent(serialized);

      if (markDirty && !dirtyNotifiedRef.current) {
        dirtyNotifiedRef.current = true;
        onMarkDirty();
      }

      return serialized;
    },
    [onCommitContent, onMarkDirty],
  );

  const handleSaveNotebook = useCallback(async () => {
    if (parseError) {
      setStatusMessage("Сначала исправьте некорректный JSON или создайте новый ноутбук.");
      return;
    }

    const serialized = serializeNotebookDocument(documentRef.current);
    lastCommittedContentRef.current = serialized;
    await onSaveContent(serialized);
    dirtyNotifiedRef.current = false;
    setStatusMessage("Ноутбук сохранён.");
  }, [onSaveContent, parseError]);

  const handleAddCell = useCallback(
    (cellType: EditableNotebookCellType, afterIndex?: number) => {
      if (parseError) {
        setStatusMessage("Сначала создайте новый ноутбук, затем редактируйте ячейки.");
        return;
      }

      const nextDocument = addNotebookCell(documentRef.current, cellType, afterIndex);
      commitDocument(nextDocument);
      setStatusMessage(
        cellType === "code" ? "Ячейка кода добавлена." : "Markdown-ячейка добавлена.",
      );
    },
    [commitDocument, parseError],
  );

  const handleDeleteCell = useCallback(
    (localId: string) => {
      const nextDocument = deleteNotebookCell(documentRef.current, localId);
      commitDocument(nextDocument);
      setStatusMessage("Ячейка удалена.");
    },
    [commitDocument],
  );

  const handleMoveCell = useCallback(
    (localId: string, direction: -1 | 1) => {
      const nextDocument = moveNotebookCell(documentRef.current, localId, direction);
      commitDocument(nextDocument);
      setStatusMessage(direction < 0 ? "Ячейка перемещена вверх." : "Ячейка перемещена вниз.");
    },
    [commitDocument],
  );

  const handleCellSourceChange = useCallback(
    (localId: string, source: string) => {
      const nextDocument = updateNotebookCellSource(documentRef.current, localId, source);
      commitDocument(nextDocument);
    },
    [commitDocument],
  );

  const handleCellModeChange = useCallback((localId: string, mode: "edit" | "preview") => {
    setDocument((currentDocument) => setNotebookCellMode(currentDocument, localId, mode));
  }, []);

  const handleResetNotebook = useCallback(() => {
    const nextDocument = createNotebookDocumentWithStarterCell("code");
    commitDocument(nextDocument);
    setStatusMessage("Создан новый ноутбук из пустого шаблона.");
  }, [commitDocument]);

  const editorLanguage = useMemo(() => resolveNotebookCodeCellLanguage(document), [document]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-editor">
      <NotebookToolbar
        cellCount={document.cells.length}
        isDirty={isDirty}
        isBlocked={Boolean(parseError)}
        statusMessage={statusMessage}
        onAddCodeCell={() => handleAddCell("code")}
        onAddMarkdownCell={() => handleAddCell("markdown")}
        onSave={handleSaveNotebook}
      />

      {parseError ? (
        <div className="border-b border-[color:var(--warning)] bg-[rgba(210,161,91,0.12)] px-4 py-3 text-sm text-primary">
          <div>Не удалось разобрать JSON ноутбука: {parseError}</div>
          <div className="mt-2">
            <button type="button" className="ui-control h-9 px-3" onClick={handleResetNotebook}>
              Создать новый ноутбук
            </button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {parseError ? (
          <div className="rounded-[18px] border border-dashed border-default bg-panel px-6 py-8 text-center">
            <div className="text-base text-primary">Редактирование ноутбука недоступно</div>
            <div className="mt-2 text-sm text-secondary">
              Исправьте JSON вне редактора ноутбука или создайте новый ноутбук из шаблона выше.
            </div>
          </div>
        ) : document.cells.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-default bg-panel px-6 py-8 text-center">
            <div className="text-base text-primary">Ноутбук пуст</div>
            <div className="mt-2 text-sm text-secondary">
              Добавьте первую ячейку кода или Markdown, чтобы начать редактирование.
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="ui-control h-9 px-3"
                onClick={() => handleAddCell("code")}
              >
                <VscAdd className="h-4 w-4" />
                <span>Добавить ячейку кода</span>
              </button>
              <button
                type="button"
                className="ui-control h-9 px-3"
                onClick={() => handleAddCell("markdown")}
              >
                <VscAdd className="h-4 w-4" />
                <span>Добавить Markdown-ячейку</span>
              </button>
            </div>
          </div>
        ) : (
          <CellList
            cells={document.cells}
            editorLanguage={editorLanguage}
            filePath={filePath}
            theme={theme}
            beforeMount={beforeMount}
            onChangeSource={handleCellSourceChange}
            onChangeMode={handleCellModeChange}
            onMove={handleMoveCell}
            onDelete={handleDeleteCell}
            onAddBelow={handleAddCell}
            onSaveRequest={handleSaveNotebook}
          />
        )}
      </div>
    </div>
  );
}
