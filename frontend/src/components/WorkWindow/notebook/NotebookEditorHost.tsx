import type * as Monaco from "monaco-editor";
import { useCallback, useMemo } from "react";
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
import type { NotebookRuntimeContext } from "./execution/types";
import { resolveNotebookCodeCellLanguage } from "./notebookLanguage";
import { useNotebookDocumentState } from "./useNotebookDocumentState";
import CellList from "./CellList";
import NotebookToolbar from "./NotebookToolbar";
import type { EditableNotebookCellType } from "./types";

type NotebookEditorHostProps = {
  filePath: string;
  content: string;
  isDirty: boolean;
  readOnly?: boolean;
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
  beforeMount: (monaco: typeof Monaco) => void;
  runtimeContext: NotebookRuntimeContext;
  onCommitContent: (nextContent: string) => void;
  onMarkDirty: () => void;
  onSaveContent: (nextContent: string) => Promise<void>;
};

export default function NotebookEditorHost({
  filePath,
  content,
  isDirty,
  readOnly = false,
  theme,
  fontSize,
  tabSize,
  beforeMount,
  runtimeContext,
  onCommitContent,
  onMarkDirty,
  onSaveContent,
}: NotebookEditorHostProps) {
  const {
    applyDocumentState,
    applyLocalDocumentUpdate,
    commitCurrentDocument,
    commitDocumentUpdate,
    document,
    documentRef,
    focusCell,
    focusSequence,
    focusTargetCellId,
    markDocumentClean,
    parseError,
    selectCell,
    selectedCellId,
    setFocusTargetCellId,
    setSelectedCellId,
    setStatusMessage,
    statusMessage,
  } = useNotebookDocumentState({
    content,
    filePath,
    isDirty,
    onCommitContent,
    onMarkDirty,
  });

  const execution = useNotebookExecution({
    runtimeContext,
    document,
    onApplyDocumentUpdate: commitDocumentUpdate,
  });

  const getCellIndex = useCallback((cellId: string) => {
    return documentRef.current.cells.findIndex((cell) => cell.localId === cellId);
  }, [documentRef]);

  const handleSaveNotebook = useCallback(async () => {
    if (readOnly) {
      setStatusMessage("У вас только доступ для чтения.");
      return;
    }

    if (parseError) {
      setStatusMessage(
        "Сначала исправьте некорректный JSON или создайте новый ноутбук.",
      );
      return;
    }

    const serialized = commitCurrentDocument();
    await onSaveContent(serialized);
    markDocumentClean();
    setStatusMessage("Ноутбук сохранён.");
  }, [
    commitCurrentDocument,
    markDocumentClean,
    onSaveContent,
    parseError,
    readOnly,
    setStatusMessage,
  ]);

  const handleAddCell = useCallback(
    (cellType: EditableNotebookCellType, afterIndex?: number) => {
      if (parseError) {
        setStatusMessage(
          "Сначала создайте новый ноутбук, затем редактируйте ячейки.",
        );
        return null;
      }

      if (readOnly) {
        setStatusMessage("У вас только доступ для чтения.");
        return null;
      }

      const currentDocument = documentRef.current;
      const selectedIndex =
        selectedCellId == null
          ? -1
          : currentDocument.cells.findIndex((cell) => cell.localId === selectedCellId);
      const resolvedAfterIndex = afterIndex == null ? selectedIndex : afterIndex;
      const insertIndex =
        resolvedAfterIndex == null ||
        resolvedAfterIndex < 0 ||
        resolvedAfterIndex >= currentDocument.cells.length
          ? currentDocument.cells.length
          : resolvedAfterIndex + 1;
      const nextDocument = commitDocumentUpdate(
        (current) => addNotebookCell(current, cellType, resolvedAfterIndex),
      );
      const nextCell = nextDocument.cells[insertIndex] ?? null;

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
    [commitDocumentUpdate, documentRef, focusCell, parseError, readOnly, selectedCellId, setStatusMessage],
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
    [documentRef, focusCell, getCellIndex, handleAddCell],
  );

  const handleDeleteCell = useCallback(
    (localId: string) => {
      const currentIndex = getCellIndex(localId);
      if (readOnly) {
        setStatusMessage("У вас только доступ для чтения.");
        return;
      }

      const currentDocument = documentRef.current;
      const fallbackSelection =
        currentDocument.cells[currentIndex + 1]?.localId ??
        currentDocument.cells[currentIndex - 1]?.localId ??
        null;

      commitDocumentUpdate((current) => deleteNotebookCell(current, localId));
      setStatusMessage("Ячейка удалена.");
      setSelectedCellId(fallbackSelection);
      setFocusTargetCellId(null);
    },
    [
      commitDocumentUpdate,
      documentRef,
      getCellIndex,
      readOnly,
      setFocusTargetCellId,
      setSelectedCellId,
      setStatusMessage,
    ],
  );

  const handleMoveCell = useCallback(
    (localId: string, direction: -1 | 1) => {
      if (readOnly) {
        setStatusMessage("У вас только доступ для чтения.");
        return;
      }

      commitDocumentUpdate((current) => moveNotebookCell(current, localId, direction));
      setSelectedCellId(localId);
      setStatusMessage(
        direction < 0
          ? "Ячейка перемещена вверх."
          : "Ячейка перемещена вниз.",
      );
    },
    [commitDocumentUpdate, readOnly, setSelectedCellId, setStatusMessage],
  );

  const handleCellSourceChange = useCallback(
    (localId: string, source: string) => {
      if (readOnly) {
        return;
      }

      applyLocalDocumentUpdate((current) => updateNotebookCellSource(current, localId, source));
    },
    [applyLocalDocumentUpdate, readOnly],
  );

  const handleCellModeChange = useCallback(
    (localId: string, mode: "edit" | "preview") => {
      if (readOnly) {
        return;
      }

      setSelectedCellId(localId);
      commitDocumentUpdate(
        (current) => setNotebookCellMode(current, localId, mode),
        { markDirty: true },
      );
    },
    [commitDocumentUpdate, readOnly, setSelectedCellId],
  );

  const handleResetNotebook = useCallback(() => {
    if (readOnly) {
      setStatusMessage("У вас только доступ для чтения.");
      return;
    }

    const nextDocument = createNotebookDocumentWithStarterCell("code");
    applyDocumentState(nextDocument, {
      markDirty: true,
      syncToStore: true,
      parseError: null,
    });
    setStatusMessage("Создан новый ноутбук из пустого шаблона.");
    focusCell(nextDocument.cells[0]?.localId ?? null);
  }, [applyDocumentState, focusCell, readOnly, setStatusMessage]);

  const handleRunCodeCell = useCallback(
    (localId: string) => {
      setSelectedCellId(localId);
      void execution.runCell(localId);
    },
    [execution, setSelectedCellId],
  );

  const handleRunCodeCellAndAdvance = useCallback(
    (localId: string) => {
      setSelectedCellId(localId);
      void execution.runCell(localId);
      focusNextCell(localId);
    },
    [execution, focusNextCell, setSelectedCellId],
  );

  const handlePreviewMarkdownCell = useCallback(
    (localId: string) => {
      setSelectedCellId(localId);
      commitDocumentUpdate((current) => setNotebookCellMode(current, localId, "preview"));
      focusCell(localId);
    },
    [commitDocumentUpdate, focusCell, setSelectedCellId],
  );

  const handlePreviewMarkdownCellAndAdvance = useCallback(
    (localId: string) => {
      setSelectedCellId(localId);
      commitDocumentUpdate((current) => setNotebookCellMode(current, localId, "preview"));
      focusNextCell(localId);
    },
    [commitDocumentUpdate, focusNextCell, setSelectedCellId],
  );

  const editorLanguage = useMemo(() => resolveNotebookCodeCellLanguage(document), [document]);
  const toolbarStatusMessage = statusMessage ?? execution.executionMessage;

  return (
    <div className="flex h-full min-h-0 flex-col bg-editor">
      <NotebookToolbar
          isBlocked={Boolean(parseError)}
          readOnly={readOnly}
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
        <div className="border-b border-[color:var(--warning)] bg-[rgba(210,161,91,0.12)] px-3 py-2 text-sm text-primary">
          <div>
            {`Не удалось разобрать JSON ноутбука: ${parseError}`}
          </div>
          <div className="mt-2">
            <button type="button" className="ui-control h-8 rounded-md border border-default bg-panel px-3" onClick={handleResetNotebook}>
              {"Создать новый ноутбук"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="ui-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3 sm:py-3">
        {parseError ? (
          <div className="rounded-[10px] border border-dashed border-default bg-panel px-5 py-7 text-center">
            <div className="text-base text-primary">
              {"Редактирование ноутбука недоступно"}
            </div>
            <div className="mt-2 text-sm text-secondary">
              {
                "Исправьте JSON вне редактора ноутбука или создайте новый ноутбук из шаблона выше."
              }
            </div>
          </div>
        ) : document.cells.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-default bg-panel px-5 py-7 text-center">
            <div className="text-base text-primary">{"Ноутбук пуст"}</div>
            <div className="mt-2 text-sm text-secondary">
              {
                "Добавьте первую ячейку кода или Markdown, чтобы начать работу."
              }
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="ui-control h-8 rounded-md border border-default bg-panel px-3"
                onClick={() => {
                  void handleAddCell("code");
                }}
              >
                <VscAdd className="h-4 w-4" />
                <span>{"Добавить ячейку кода"}</span>
              </button>
              <button
                type="button"
                className="ui-control h-8 rounded-md border border-default bg-panel px-3"
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
          fontSize={fontSize}
          tabSize={tabSize}
          beforeMount={beforeMount}
          readOnly={readOnly}
          cellExecutionState={execution.cellStates}
          canExecuteCodeCells={
            !readOnly && !parseError && execution.canExecute && !execution.isRunningAnyCell
          }
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
