import type * as Monaco from "monaco-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  VscAdd,
  VscChevronDown,
  VscChevronUp,
  VscDebugRestart,
  VscDebugStop,
  VscEdit,
  VscEye,
  VscMarkdown,
  VscPlay,
  VscRefresh,
  VscSave,
  VscTrash,
} from "react-icons/vsc";
import { type ThemeName } from "../../styles/tokens";
import { renderMarkdownToHtml } from "./markdownPreview";
import NotebookOutputView from "./NotebookOutput";
import {
  buildDocWithKernel,
  createNewCell,
  extractMetadata,
  isRecord,
  parseNotebookContent,
  serializeNotebook,
  type NotebookCell,
  type NotebookCellType,
  type NotebookRecord,
} from "./notebookModel";
import NotebookSourceEditor from "./NotebookSourceEditor";

type NotebookEditorProps = {
  filePath: string;
  content: string;
  isDirty: boolean;
  theme: ThemeName;
  rootPath: string;
  beforeMount: (monaco: typeof Monaco) => void;
  onCommitContent: (nextContent: string) => void;
  onMarkDirty: () => void;
  onSaveContent: (nextContent: string) => Promise<void>;
};

type CommitOptions = {
  markDirty?: boolean;
};

function createEmptyNotebookDoc(): NotebookRecord {
  return {
    cells: [],
    metadata: {},
    nbformat: 4,
    nbformat_minor: 5,
  };
}

function createNotebookCell(cellType: NotebookCellType) {
  const cell = createNewCell(cellType);

  return cellType === "markdown"
    ? {
        ...cell,
        mode: "preview" as const,
      }
    : cell;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function resolveExplicitKernelPath(
  doc: NotebookRecord,
  kernels: NotebookKernelDescriptor[],
) {
  const metadata = extractMetadata(doc);
  const crosspp = isRecord(metadata.crosspp) ? metadata.crosspp : null;

  if (typeof crosspp?.interpreterPath === "string") {
    const exactMatch = kernels.find((kernel) => kernel.interpreterPath === crosspp.interpreterPath);

    if (exactMatch) {
      return exactMatch.interpreterPath;
    }
  }

  const kernelspec = isRecord(metadata.kernelspec) ? metadata.kernelspec : null;

  if (typeof kernelspec?.display_name === "string") {
    const displayMatch = kernels.find((kernel) => kernel.displayName === kernelspec.display_name);

    if (displayMatch) {
      return displayMatch.interpreterPath;
    }
  }

  return null;
}

export default function NotebookEditor({
  filePath,
  content,
  isDirty,
  theme,
  rootPath,
  beforeMount,
  onCommitContent,
  onMarkDirty,
  onSaveContent,
}: NotebookEditorProps) {
  const [doc, setDoc] = useState<NotebookRecord>(() => createEmptyNotebookDoc());
  const [cells, setCells] = useState<NotebookCell[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [availableKernels, setAvailableKernels] = useState<NotebookKernelDescriptor[]>([]);
  const [selectedInterpreterPath, setSelectedInterpreterPath] = useState<string | null>(null);
  const [kernelDiagnostics, setKernelDiagnostics] = useState<NotebookKernelDiscoveryDiagnostic[]>([]);
  const [isRefreshingKernels, setIsRefreshingKernels] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const docRef = useRef(doc);
  const cellsRef = useRef(cells);
  const selectedInterpreterPathRef = useRef<string | null>(null);
  const lastFilePathRef = useRef<string | null>(null);
  const lastCommittedContentRef = useRef<string | null>(null);
  const dirtyNotifiedRef = useRef(isDirty);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  useEffect(() => {
    selectedInterpreterPathRef.current = selectedInterpreterPath;
  }, [selectedInterpreterPath]);

  const applyParsedNotebook = useCallback(
    (nextContent: string, dirtyState: boolean) => {
      const parsed = parseNotebookContent(nextContent);
      const nextDoc = parsed.doc;
      const nextCells = parsed.cells;
      const nextSelectedKernel =
        selectedInterpreterPath && availableKernels.some((kernel) => kernel.interpreterPath === selectedInterpreterPath)
          ? selectedInterpreterPath
          : resolveExplicitKernelPath(nextDoc, availableKernels);

      docRef.current = nextDoc;
      cellsRef.current = nextCells;
      dirtyNotifiedRef.current = dirtyState;
      selectedInterpreterPathRef.current = nextSelectedKernel;

      setDoc(nextDoc);
      setCells(nextCells);
      setParseError(parsed.parseError);
      setSelectedInterpreterPath(nextSelectedKernel);
      setStatusMessage(parsed.parseError ? "Notebook содержит некорректный JSON." : null);
    },
    [availableKernels, selectedInterpreterPath],
  );

  useEffect(() => {
    if (filePath !== lastFilePathRef.current || content !== lastCommittedContentRef.current) {
      lastFilePathRef.current = filePath;
      lastCommittedContentRef.current = content;
      applyParsedNotebook(content, isDirty);
      return;
    }

    dirtyNotifiedRef.current = isDirty;
  }, [applyParsedNotebook, content, filePath, isDirty]);

  const commitNotebook = useCallback(
    (nextDoc: NotebookRecord, nextCells: NotebookCell[], options: CommitOptions = {}) => {
      const { markDirty = true } = options;
      const serialized = serializeNotebook(nextDoc, nextCells);

      docRef.current = nextDoc;
      cellsRef.current = nextCells;
      lastCommittedContentRef.current = serialized;

      setDoc(nextDoc);
      setCells(nextCells);
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

  const refreshKernels = useCallback(
    async (forceRefresh: boolean) => {
      setIsRefreshingKernels(true);

      try {
        const options = {
          workspacePath: rootPath,
          notebookPath: filePath,
        };
        const result = forceRefresh
          ? await window.electronAPI.refreshNotebookKernels(options)
          : await window.electronAPI.listNotebookKernels(options);
        const resolvedKernelPath = resolveExplicitKernelPath(docRef.current, result.kernels);

        setAvailableKernels(result.kernels);
        setKernelDiagnostics(result.diagnostics);
        setSelectedInterpreterPath((currentValue) => {
          if (
            currentValue &&
            result.kernels.some((kernel) => kernel.interpreterPath === currentValue)
          ) {
            selectedInterpreterPathRef.current = currentValue;
            return currentValue;
          }

          selectedInterpreterPathRef.current = resolvedKernelPath;
          return resolvedKernelPath;
        });
        setStatusMessage(
          result.kernels.length > 0
            ? `Найдено Python kernels: ${result.kernels.length}.`
            : "Подходящие Python kernels пока не найдены.",
        );
      } catch (error) {
        setStatusMessage(getErrorMessage(error, "Не удалось получить список Python kernels."));
      } finally {
        setIsRefreshingKernels(false);
      }
    },
    [filePath, rootPath],
  );

  useEffect(() => {
    void refreshKernels(false);
  }, [refreshKernels]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onNotebookKernelEvent((event) => {
      if (event.notebookPath !== filePath) {
        return;
      }

      if (event.type === "kernel-ready") {
        setStatusMessage(`Kernel готов: ${event.displayName}.`);
        return;
      }

      if (event.type === "kernel-restarted") {
        setStatusMessage("Kernel перезапущен.");
        return;
      }

      if (event.type === "kernel-exited") {
        setStatusMessage(`Kernel завершился: ${event.reason}.`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [filePath]);

  const selectedKernel = useMemo(
    () =>
      availableKernels.find((kernel) => kernel.interpreterPath === selectedInterpreterPath) ?? null,
    [availableKernels, selectedInterpreterPath],
  );

  const updateCells = useCallback(
    (
      updater: (currentCells: NotebookCell[]) => NotebookCell[],
      options: CommitOptions = {},
    ) => {
      const nextCells = updater(cellsRef.current);
      commitNotebook(docRef.current, nextCells, options);
    },
    [commitNotebook],
  );

  const handleSaveNotebook = useCallback(async () => {
    const serialized = serializeNotebook(docRef.current, cellsRef.current);
    lastCommittedContentRef.current = serialized;
    await onSaveContent(serialized);
    dirtyNotifiedRef.current = false;
    setStatusMessage("Notebook сохранен.");
  }, [onSaveContent]);

  const handleKernelChange = useCallback(
    (nextInterpreterPath: string) => {
      if (nextInterpreterPath === "__unselected__") {
        return;
      }

      const nextKernel =
        availableKernels.find((kernel) => kernel.interpreterPath === nextInterpreterPath) ?? null;
      const nextDoc = buildDocWithKernel(docRef.current, nextKernel);

      selectedInterpreterPathRef.current = nextKernel?.interpreterPath ?? null;
      setSelectedInterpreterPath(nextKernel?.interpreterPath ?? null);
      commitNotebook(nextDoc, cellsRef.current);
      setStatusMessage(
        nextKernel
          ? `Выбран kernel: ${nextKernel.displayName}.`
          : "Связанный Python kernel очищен.",
      );
    },
    [availableKernels, commitNotebook],
  );

  const handleResetNotebook = useCallback(() => {
    const nextDoc = createEmptyNotebookDoc();
    const nextCells = [createNotebookCell("code")];

    commitNotebook(nextDoc, nextCells);
    setStatusMessage("Создан новый notebook на основе пустого шаблона.");
  }, [commitNotebook]);

  const handleAddCell = useCallback(
    (cellType: NotebookCellType, afterIndex?: number) => {
      const nextCell = createNotebookCell(cellType);

      updateCells((currentCells) => {
        if (afterIndex == null || afterIndex < 0 || afterIndex >= currentCells.length) {
          return [...currentCells, nextCell];
        }

        return [
          ...currentCells.slice(0, afterIndex + 1),
          nextCell,
          ...currentCells.slice(afterIndex + 1),
        ];
      });

      setStatusMessage(cellType === "code" ? "Добавлена code-cell." : "Добавлена markdown-cell.");
    },
    [updateCells],
  );

  const handleDeleteCell = useCallback(
    (localId: string) => {
      updateCells((currentCells) => currentCells.filter((cell) => cell.localId !== localId));
      setStatusMessage("Ячейка удалена.");
    },
    [updateCells],
  );

  const handleMoveCell = useCallback(
    (localId: string, direction: -1 | 1) => {
      updateCells((currentCells) => {
        const currentIndex = currentCells.findIndex((cell) => cell.localId === localId);

        if (currentIndex === -1) {
          return currentCells;
        }

        const nextIndex = currentIndex + direction;

        if (nextIndex < 0 || nextIndex >= currentCells.length) {
          return currentCells;
        }

        const nextCells = [...currentCells];
        const [cell] = nextCells.splice(currentIndex, 1);
        nextCells.splice(nextIndex, 0, cell);
        return nextCells;
      });
    },
    [updateCells],
  );

  const handleCellChange = useCallback(
    (localId: string, nextSource: string) => {
      updateCells((currentCells) =>
        currentCells.map((cell) =>
          cell.localId === localId
            ? {
                ...cell,
                source: nextSource,
              }
            : cell,
        ),
      );
    },
    [updateCells],
  );

  const handleCellModeChange = useCallback(
    (localId: string, nextMode: "edit" | "preview") => {
      updateCells(
        (currentCells) =>
          currentCells.map((cell) =>
            cell.localId === localId
              ? {
                  ...cell,
                  mode: nextMode,
                }
              : cell,
          ),
        { markDirty: false },
      );
    },
    [updateCells],
  );

  const handleRunCell = useCallback(
    async (localId: string) => {
      const cell = cellsRef.current.find((currentCell) => currentCell.localId === localId);
      const interpreterPath = selectedInterpreterPathRef.current;

      if (!cell || cell.cellType !== "code") {
        return;
      }

      if (!interpreterPath) {
        setStatusMessage("Выберите Python kernel перед запуском ячейки.");
        return;
      }

      const runStartedCells = cellsRef.current.map((currentCell) =>
        currentCell.localId === localId
          ? {
              ...currentCell,
              isRunning: true,
              outputs: [],
              executionCount: null,
            }
          : currentCell,
      );

      commitNotebook(docRef.current, runStartedCells);
      setStatusMessage("Выполняется ячейка notebook.");

      try {
        const result = await window.electronAPI.executeNotebookCell({
          notebookPath: filePath,
          interpreterPath,
          cellId: localId,
          source: cell.source,
        });

        const finishedCells = runStartedCells.map((currentCell) =>
          currentCell.localId === localId
            ? {
                ...currentCell,
                isRunning: false,
                outputs: result.outputs,
                executionCount: result.executionCount,
                data: {
                  ...currentCell.data,
                  outputs: result.outputs,
                  execution_count: result.executionCount ?? null,
                },
              }
            : currentCell,
        );

        commitNotebook(docRef.current, finishedCells);
        setStatusMessage(
          result.status === "ok"
            ? "Ячейка успешно выполнена."
            : result.status === "interrupted"
              ? "Выполнение ячейки остановлено."
              : "Ячейка завершилась с ошибкой.",
        );
      } catch (error) {
        const message = getErrorMessage(error, "Не удалось выполнить выбранную ячейку.");
        const failedCells = runStartedCells.map((currentCell) =>
          currentCell.localId === localId
            ? {
                ...currentCell,
                isRunning: false,
                outputs: [
                  {
                    output_type: "error" as const,
                    ename: "ExecutionError",
                    evalue: message,
                    traceback: [],
                  },
                ],
                executionCount: null,
                data: {
                  ...currentCell.data,
                  outputs: [
                    {
                      output_type: "error" as const,
                      ename: "ExecutionError",
                      evalue: message,
                      traceback: [],
                    },
                  ],
                  execution_count: null,
                },
              }
            : currentCell,
        );

        commitNotebook(docRef.current, failedCells);
        setStatusMessage(message);
      }
    },
    [commitNotebook, filePath],
  );

  const handleRunAll = useCallback(async () => {
    const codeCellIds = cellsRef.current
      .filter((cell) => cell.cellType === "code")
      .map((cell) => cell.localId);

    if (codeCellIds.length === 0) {
      setStatusMessage("В notebook пока нет code-cells для запуска.");
      return;
    }

    setIsRunningAll(true);

    try {
      for (const localId of codeCellIds) {
        await handleRunCell(localId);
      }
    } finally {
      setIsRunningAll(false);
    }
  }, [handleRunCell]);

  const handleInterruptKernel = useCallback(async () => {
    try {
      await window.electronAPI.interruptNotebookKernel(filePath);
      setStatusMessage("Kernel остановлен по запросу пользователя.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Не удалось остановить Python kernel."));
    }
  }, [filePath]);

  const handleRestartKernel = useCallback(async () => {
    const interpreterPath = selectedInterpreterPathRef.current;

    if (!interpreterPath) {
      setStatusMessage("Сначала выберите Python kernel для notebook.");
      return;
    }

    try {
      const result = await window.electronAPI.restartNotebookKernel({
        notebookPath: filePath,
        interpreterPath,
      });

      if (result.kernel) {
        const nextDoc = buildDocWithKernel(docRef.current, result.kernel);
        selectedInterpreterPathRef.current = result.kernel.interpreterPath;
        setSelectedInterpreterPath(result.kernel.interpreterPath);
        commitNotebook(nextDoc, cellsRef.current, { markDirty: false });
      }

      setStatusMessage("Kernel успешно перезапущен.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Не удалось перезапустить Python kernel."));
    }
  }, [commitNotebook, filePath]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-editor">
      <div className="sticky top-0 z-10 border-b border-default bg-panel/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-primary">Notebook editor</div>
            <div className="text-xs text-muted">
              Редактирование, выбор kernel и запуск ячеек внутри проекта.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="ui-control h-9 px-3" onClick={() => handleAddCell("code")}>
              <VscAdd className="h-4 w-4" />
              <span>Code</span>
            </button>

            <button
              type="button"
              className="ui-control h-9 px-3"
              onClick={() => handleAddCell("markdown")}
            >
              <VscMarkdown className="h-4 w-4" />
              <span>Markdown</span>
            </button>

            <button type="button" className="ui-control h-9 px-3" onClick={() => void handleRunAll()}>
              <VscPlay className="h-4 w-4" />
              <span>{isRunningAll ? "Running..." : "Run all"}</span>
            </button>

            <button
              type="button"
              className="ui-control h-9 px-3"
              onClick={() => void handleInterruptKernel()}
            >
              <VscDebugStop className="h-4 w-4" />
              <span>Interrupt</span>
            </button>

            <button
              type="button"
              className="ui-control h-9 px-3"
              onClick={() => void handleRestartKernel()}
            >
              <VscDebugRestart className="h-4 w-4" />
              <span>Restart</span>
            </button>

            <button type="button" className="ui-control h-9 px-3" onClick={() => void handleSaveNotebook()}>
              <VscSave className="h-4 w-4" />
              <span>Save</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex min-w-[260px] items-center gap-2 text-xs text-secondary">
            <span className="whitespace-nowrap">Python kernel</span>
            <select
              className="h-9 min-w-0 flex-1 rounded-[12px] border border-default bg-input px-3 text-sm text-primary outline-none"
              value={selectedInterpreterPath ?? "__unselected__"}
              onChange={(event) => handleKernelChange(event.target.value)}
            >
              <option value="__unselected__" disabled>
                Выберите kernel
              </option>
              {availableKernels.map((kernel) => (
                <option key={kernel.id} value={kernel.interpreterPath}>
                  {kernel.displayName}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="ui-control h-9 px-3"
            onClick={() => void refreshKernels(true)}
            disabled={isRefreshingKernels}
          >
            <VscRefresh className="h-4 w-4" />
            <span>{isRefreshingKernels ? "Обновление..." : "Refresh kernels"}</span>
          </button>

          <div className="text-xs text-muted">
            {selectedKernel
              ? `${selectedKernel.displayName} (${selectedKernel.kind})`
              : "Kernel пока не выбран."}
          </div>
        </div>

        {statusMessage ? <div className="mt-3 text-xs text-secondary">{statusMessage}</div> : null}

        {kernelDiagnostics.length > 0 ? (
          <div className="mt-2 text-xs text-muted">
            Диагностика kernel discovery: {kernelDiagnostics.length}
          </div>
        ) : null}
      </div>

      {parseError ? (
        <div className="border-b border-[color:var(--warning)] bg-[rgba(210,161,91,0.12)] px-4 py-3 text-sm text-primary">
          <div>Не удалось корректно распарсить notebook JSON: {parseError}</div>
          <div className="mt-2">
            <button type="button" className="ui-control h-9 px-3" onClick={handleResetNotebook}>
              Создать новый notebook
            </button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {cells.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-default bg-panel px-6 py-8 text-center">
            <div className="text-base text-primary">Notebook пока пуст</div>
            <div className="mt-2 text-sm text-secondary">
              Добавьте первую code-cell или markdown-cell, чтобы начать работу.
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="ui-control h-9 px-3"
                onClick={() => handleAddCell("code")}
              >
                <VscAdd className="h-4 w-4" />
                <span>Добавить code-cell</span>
              </button>
              <button
                type="button"
                className="ui-control h-9 px-3"
                onClick={() => handleAddCell("markdown")}
              >
                <VscAdd className="h-4 w-4" />
                <span>Добавить markdown-cell</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {cells.map((cell, index) => {
              const isMarkdownPreview = cell.cellType === "markdown" && cell.mode === "preview";

              return (
                <section
                  key={cell.localId}
                  className="overflow-hidden rounded-[18px] border border-default bg-panel shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm text-primary">
                        {cell.cellType === "code" ? `Code cell ${index + 1}` : `Markdown cell ${index + 1}`}
                      </div>
                      <div className="text-xs text-muted">
                        {cell.isRunning
                          ? "Ячейка выполняется прямо сейчас."
                          : cell.executionCount != null
                            ? `Последний execution count: ${cell.executionCount}`
                            : "Еще не запускалась."}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {cell.cellType === "markdown" ? (
                        <>
                          <button
                            type="button"
                            className={`ui-control h-8 px-3 ${!isMarkdownPreview ? "border-default bg-editor text-primary" : ""}`}
                            onClick={() => handleCellModeChange(cell.localId, "edit")}
                          >
                            <VscEdit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className={`ui-control h-8 px-3 ${isMarkdownPreview ? "border-default bg-editor text-primary" : ""}`}
                            onClick={() => handleCellModeChange(cell.localId, "preview")}
                          >
                            <VscEye className="h-4 w-4" />
                            <span>Preview</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ui-control h-8 px-3"
                          onClick={() => void handleRunCell(cell.localId)}
                        >
                          <VscPlay className="h-4 w-4" />
                          <span>{cell.isRunning ? "Running..." : "Run"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="ui-control h-8 w-8"
                        onClick={() => handleMoveCell(cell.localId, -1)}
                        title="Переместить выше"
                      >
                        <VscChevronUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className="ui-control h-8 w-8"
                        onClick={() => handleMoveCell(cell.localId, 1)}
                        title="Переместить ниже"
                      >
                        <VscChevronDown className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className="ui-control h-8 w-8"
                        onClick={() => handleDeleteCell(cell.localId)}
                        title="Удалить ячейку"
                      >
                        <VscTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    {isMarkdownPreview ? (
                      <div
                        className="markdown-preview rounded-[16px] border border-default bg-input px-5 py-5"
                        dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(cell.source, filePath) }}
                      />
                    ) : (
                      <NotebookSourceEditor
                        editorPath={`${filePath}#${cell.localId}`}
                        language={cell.cellType === "code" ? "python" : "markdown"}
                        value={cell.source}
                        theme={theme}
                        beforeMount={beforeMount}
                        onChange={(nextValue) => handleCellChange(cell.localId, nextValue)}
                        onSaveRequest={handleSaveNotebook}
                        onRun={
                          cell.cellType === "code"
                            ? () => {
                                void handleRunCell(cell.localId);
                              }
                            : undefined
                        }
                        onRunAndAdvance={
                          cell.cellType === "code"
                            ? () => {
                                void handleRunCell(cell.localId);
                              }
                            : undefined
                        }
                        lineNumbers={cell.cellType === "code" ? "on" : "off"}
                        minHeight={cell.cellType === "code" ? 160 : 120}
                        tabSize={cell.cellType === "code" ? 4 : 2}
                      />
                    )}

                    {cell.cellType === "code" ? (
                      <div className="mt-4">
                        <NotebookOutputView outputs={cell.outputs} filePath={filePath} theme={theme} />
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="ui-control h-8 px-3"
                        onClick={() => handleAddCell("code", index)}
                      >
                        <VscAdd className="h-4 w-4" />
                        <span>Code below</span>
                      </button>

                      <button
                        type="button"
                        className="ui-control h-8 px-3"
                        onClick={() => handleAddCell("markdown", index)}
                      >
                        <VscAdd className="h-4 w-4" />
                        <span>Markdown below</span>
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
