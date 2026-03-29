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
import { useNotebookExecution } from "./execution/useNotebookExecution";
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
  runtimeContext:
    | {
        kind: "local";
        runtimeId: string;
        notebookPath: string;
        workspaceRootPath?: string | null;
      }
    | {
        kind: "cloud";
        runtimeId: string;
        editorPath: string;
        projectId: string;
        fileId: string;
        name: string;
      };
  onCommitContent: (nextContent: string) => void;
  onMarkDirty: () => void;
  onSaveContent: (nextContent: string) => Promise<void>;
};

type CommitOptions = {
  markDirty?: boolean;
};

function getInitialSelection(document: NotebookDocumentModel) {
  return document.cells[0]?.localId ?? null;
}

export default function NotebookEditorHost({
  filePath,
  content,
  isDirty,
  theme,
  beforeMount,
  runtimeContext,
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
  const [selectedCellId, setSelectedCellId] = useState<string | null>(
    () =>
      getInitialSelection(
        initialParsedRef.current?.document ?? createNotebookDocumentWithStarterCell("code"),
      ),
  );
  const [focusTargetCellId, setFocusTargetCellId] = useState<string | null>(null);
  const [focusSequence, setFocusSequence] = useState(0);

  const documentRef = useRef(document);
  const lastFilePathRef = useRef(filePath);
  const lastCommittedContentRef = useRef(content);
  const dirtyNotifiedRef = useRef(isDirty);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const focusCell = useCallback((cellId: string | null) => {
    setSelectedCellId(cellId);

    if (!cellId) {
      setFocusTargetCellId(null);
      return;
    }

    setFocusTargetCellId(cellId);
    setFocusSequence((current) => current + 1);
  }, []);

  const selectCell = useCallback((cellId: string) => {
    setSelectedCellId(cellId);
  }, []);

  const applyParsedNotebook = useCallback((nextContent: string, dirtyState: boolean) => {
    const parsed = parseNotebookContent(nextContent);

    documentRef.current = parsed.document;
    dirtyNotifiedRef.current = dirtyState;

    setDocument(parsed.document);
    setParseError(parsed.parseError);
    setStatusMessage(
      parsed.parseError ? "В ноутбуке некорректный JSON." : null,
    );
    setSelectedCellId(getInitialSelection(parsed.document));
    setFocusTargetCellId(null);
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

  useEffect(() => {
    setSelectedCellId((current) => {
      if (current && document.cells.some((cell) => cell.localId === current)) {
        return current;
      }

      return getInitialSelection(document);
    });
  }, [document]);

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

  const applyDocumentUpdate = useCallback(
    (updater: (currentDocument: NotebookDocumentModel) => NotebookDocumentModel) => {
      const nextDocument = updater(documentRef.current);
      commitDocument(nextDocument);
    },
    [commitDocument],
  );

  const applyTransientDocumentUpdate = useCallback(
    (updater: (currentDocument: NotebookDocumentModel) => NotebookDocumentModel) => {
      const nextDocument = updater(documentRef.current);
      documentRef.current = nextDocument;
      setDocument(nextDocument);
    },
    [],
  );

  const execution = useNotebookExecution({
    runtimeContext,
    document,
    onApplyDocumentUpdate: applyDocumentUpdate,
  });

  const getCellIndex = useCallback((cellId: string) => {
    return documentRef.current.cells.findIndex((cell) => cell.localId === cellId);
  }, []);

  const handleSaveNotebook = useCallback(async () => {
    if (parseError) {
      setStatusMessage(
        "Сначала исправьте некорректный JSON или создайте новый ноутбук.",
      );
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
        setStatusMessage(
          "Сначала создайте новый ноутбук, затем редактируйте ячейки.",
        );
        return null;
      }

      const currentDocument = documentRef.current;
      const selectedIndex =
        selectedCellId == null
          ? -1
          : currentDocument.cells.findIndex((cell) => cell.localId === selectedCellId);
      const resolvedAfterIndex = afterIndex == null ? selectedIndex : afterIndex;
      const insertIndex =
        resolvedAfterIndex == null || resolvedAfterIndex < 0 || resolvedAfterIndex >= currentDocument.cells.length
          ? currentDocument.cells.length
          : resolvedAfterIndex + 1;
      const nextDocument = addNotebookCell(currentDocument, cellType, resolvedAfterIndex);
      const nextCell = nextDocument.cells[insertIndex] ?? null;

      commitDocument(nextDocument);
      setStatusMessage(
        cellType === "code"
          ? "Ячейка кода добавлена."
          : "Markdown-ячейка добавлена.",
      );

      if (nextCell) {
        focusCell(nextCell.localId);
      }

      return nextCell?.localId ?? null;
    },
    [commitDocument, focusCell, parseError, selectedCellId],
  );

  const focusNextCell = useCallback(
    (localId: string) => {
      const currentIndex = getCellIndex(localId);

      if (currentIndex === -1) {
        return;
      }

      const nextCell = documentRef.current.cells[currentIndex + 1];

      if (nextCell) {
        focusCell(nextCell.localId);
        return;
      }

      const createdCellId = handleAddCell("code", currentIndex);
      if (createdCellId) {
        focusCell(createdCellId);
      }
    },
    [focusCell, getCellIndex, handleAddCell],
  );

  const handleDeleteCell = useCallback(
    (localId: string) => {
      const currentIndex = getCellIndex(localId);
      const currentDocument = documentRef.current;
      const fallbackSelection =
        currentDocument.cells[currentIndex + 1]?.localId ??
        currentDocument.cells[currentIndex - 1]?.localId ??
        null;
      const nextDocument = deleteNotebookCell(currentDocument, localId);

      commitDocument(nextDocument);
      setStatusMessage("Ячейка удалена.");
      setSelectedCellId(fallbackSelection);
      setFocusTargetCellId(null);
    },
    [commitDocument, getCellIndex],
  );

  const handleMoveCell = useCallback(
    (localId: string, direction: -1 | 1) => {
      const nextDocument = moveNotebookCell(documentRef.current, localId, direction);
      commitDocument(nextDocument);
      setSelectedCellId(localId);
      setStatusMessage(
        direction < 0
          ? "Ячейка перемещена вверх."
          : "Ячейка перемещена вниз.",
      );
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

  const handleCellModeChange = useCallback(
    (localId: string, mode: "edit" | "preview") => {
      setSelectedCellId(localId);
      applyTransientDocumentUpdate((currentDocument) =>
        setNotebookCellMode(currentDocument, localId, mode),
      );
    },
    [applyTransientDocumentUpdate],
  );

  const handleResetNotebook = useCallback(() => {
    const nextDocument = createNotebookDocumentWithStarterCell("code");
    commitDocument(nextDocument);
    setStatusMessage(
      "Создан новый ноутбук из пустого шаблона.",
    );
    focusCell(nextDocument.cells[0]?.localId ?? null);
  }, [commitDocument, focusCell]);

  const handleRunCodeCell = useCallback(
    (localId: string) => {
      setSelectedCellId(localId);
      void execution.runCell(localId);
    },
    [execution],
  );

  const handleRunCodeCellAndAdvance = useCallback(
    (localId: string) => {
      setSelectedCellId(localId);
      void execution.runCell(localId);
      focusNextCell(localId);
    },
    [execution, focusNextCell],
  );

  const handlePreviewMarkdownCell = useCallback(
    (localId: string) => {
      setSelectedCellId(localId);
      applyTransientDocumentUpdate((currentDocument) =>
        setNotebookCellMode(currentDocument, localId, "preview"),
      );
      focusCell(localId);
    },
    [applyTransientDocumentUpdate, focusCell],
  );

  const handlePreviewMarkdownCellAndAdvance = useCallback(
    (localId: string) => {
      setSelectedCellId(localId);
      applyTransientDocumentUpdate((currentDocument) =>
        setNotebookCellMode(currentDocument, localId, "preview"),
      );
      focusNextCell(localId);
    },
    [applyTransientDocumentUpdate, focusNextCell],
  );

  const editorLanguage = useMemo(() => resolveNotebookCodeCellLanguage(document), [document]);
  const toolbarStatusMessage = statusMessage ?? execution.executionMessage;

  return (
    <div className="flex h-full min-h-0 flex-col bg-editor">
      <NotebookToolbar
        cellCount={document.cells.length}
        isDirty={isDirty}
        isBlocked={Boolean(parseError)}
        statusMessage={toolbarStatusMessage}
        execution={{
          kernels: execution.kernels,
          kernelsLoading: execution.kernelsLoading,
          kernelsError: execution.kernelsError,
          selectedKernelId: execution.selectedKernelId,
          sessionStatus: execution.sessionStatus,
          sessionDetail: execution.sessionDetail,
          canExecute: !parseError && execution.canExecute,
          isRunningAnyCell: execution.isRunningAnyCell,
          onRefreshKernels: execution.refreshKernels,
          onSelectKernel: execution.selectKernel,
          onRunAll: execution.runAll,
          onInterruptKernel: execution.interruptKernel,
          onRestartKernel: execution.restartKernel,
        }}
        onAddCodeCell={() => {
          void handleAddCell("code");
        }}
        onAddMarkdownCell={() => {
          void handleAddCell("markdown");
        }}
      />

      {parseError ? (
        <div className="border-b border-[color:var(--warning)] bg-[rgba(210,161,91,0.12)] px-4 py-3 text-sm text-primary">
          <div>
            {`Не удалось разобрать JSON ноутбука: ${parseError}`}
          </div>
          <div className="mt-2">
            <button type="button" className="ui-control h-9 px-3" onClick={handleResetNotebook}>
              {"Создать новый ноутбук"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {parseError ? (
          <div className="rounded-[18px] border border-dashed border-default bg-panel px-6 py-8 text-center">
            <div className="text-base text-primary">
              {"Редактирование ноутбука недоступно"}
            </div>
            <div className="mt-2 text-sm text-secondary">
              {
                "Исправьте JSON вне notebook editor или создайте новый ноутбук из шаблона выше."
              }
            </div>
          </div>
        ) : document.cells.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-default bg-panel px-6 py-8 text-center">
            <div className="text-base text-primary">{"Ноутбук пуст"}</div>
            <div className="mt-2 text-sm text-secondary">
              {
                "Добавьте первую ячейку кода или Markdown, чтобы начать работу."
              }
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="ui-control h-9 px-3"
                onClick={() => {
                  void handleAddCell("code");
                }}
              >
                <VscAdd className="h-4 w-4" />
                <span>{"Добавить ячейку кода"}</span>
              </button>
              <button
                type="button"
                className="ui-control h-9 px-3"
                onClick={() => {
                  void handleAddCell("markdown");
                }}
              >
                <VscAdd className="h-4 w-4" />
                <span>{"Добавить Markdown-ячейку"}</span>
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
            cellExecutionState={execution.cellStates}
            canExecuteCodeCells={!parseError && execution.canExecute && !execution.isRunningAnyCell}
            selectedCellId={selectedCellId}
            focusTargetCellId={focusTargetCellId}
            focusSequence={focusSequence}
            onSelectCell={selectCell}
            onRunCodeCell={handleRunCodeCell}
            onRunCodeCellAndAdvance={handleRunCodeCellAndAdvance}
            onPreviewMarkdownCell={handlePreviewMarkdownCell}
            onPreviewMarkdownCellAndAdvance={handlePreviewMarkdownCellAndAdvance}
            onChangeSource={handleCellSourceChange}
            onChangeMode={handleCellModeChange}
            onMove={handleMoveCell}
            onDelete={handleDeleteCell}
            onSaveRequest={handleSaveNotebook}
          />
        )}
      </div>
    </div>
  );
}
