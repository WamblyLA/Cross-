import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as cloudApi from "../../../../features/cloud/cloudApi";
import { selectOpenedFiles } from "../../../../features/files/filesSelectors";
import { useAppSelector } from "../../../../store/hooks";
import {
  appendNotebookCellOutput,
  clearNotebookCellExecution,
  patchNotebookCellOutput,
  replaceNotebookCellOutputs,
  setNotebookMetadataKernelspec,
} from "../notebookDocument";
import type { NotebookDocumentModel } from "../types";
import type { NotebookExecutionViewState } from "./types";

type UseNotebookExecutionOptions = {
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
  document: NotebookDocumentModel;
  onApplyDocumentUpdate: (
    updater: (document: NotebookDocumentModel) => NotebookDocumentModel,
  ) => void;
};

const INITIAL_STATE: NotebookExecutionViewState = {
  kernels: [],
  kernelsLoading: false,
  kernelsError: null,
  selectedKernelId: null,
  sessionStatus: "unbound",
  sessionDetail: null,
  executionMessage: null,
  isRunningAnyCell: false,
  cellStates: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPreferredKernelId(document: NotebookDocumentModel) {
  const metadata = isRecord(document.raw.metadata) ? document.raw.metadata : null;
  const kernelspec = metadata && isRecord(metadata.kernelspec) ? metadata.kernelspec : null;

  if (!kernelspec) {
    return null;
  }

  const name = kernelspec.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function buildRunningMap(
  cellStates: NotebookExecutionViewState["cellStates"],
  targetCellId: string,
  nextState: NotebookExecutionViewState["cellStates"][string],
) {
  return {
    ...cellStates,
    [targetCellId]: nextState,
  };
}

function completeRunningCellStates(
  cellStates: NotebookExecutionViewState["cellStates"],
  lastStatus: NotebookExecutionStatus,
  finishedAtMs: number,
): NotebookExecutionViewState["cellStates"] {
  return Object.fromEntries(
    Object.entries(cellStates).map(([cellId, cellState]) => [
      cellId,
      cellState.isRunning
        ? {
            isRunning: false,
            lastStatus,
            startedAtMs: null,
            lastDurationMs:
              cellState.startedAtMs != null
                ? Math.max(0, finishedAtMs - cellState.startedAtMs)
                : cellState.lastDurationMs,
          }
        : cellState,
    ]),
  );
}

export function useNotebookExecution({
  runtimeContext,
  document,
  onApplyDocumentUpdate,
}: UseNotebookExecutionOptions) {
  const openedFiles = useAppSelector(selectOpenedFiles);
  const [state, setState] = useState<NotebookExecutionViewState>(() => ({
    ...INITIAL_STATE,
    selectedKernelId: getPreferredKernelId(document),
  }));
  const mountedRef = useRef(true);
  const documentRef = useRef(document);
  const selectedKernelIdRef = useRef(state.selectedKernelId);
  const kernelsRef = useRef(state.kernels);
  const autoStartedKeyRef = useRef<string | null>(null);
  const runAllInProgressRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    selectedKernelIdRef.current = state.selectedKernelId;
  }, [state.selectedKernelId]);

  useEffect(() => {
    kernelsRef.current = state.kernels;
  }, [state.kernels]);

  useEffect(() => {
    const preferredKernelId = getPreferredKernelId(documentRef.current);
    autoStartedKeyRef.current = null;
    setState({
      ...INITIAL_STATE,
      selectedKernelId: preferredKernelId,
    });
  }, [runtimeContext.runtimeId]);

  const applyDocumentUpdate = useCallback(
    (updater: (currentDocument: NotebookDocumentModel) => NotebookDocumentModel) => {
      onApplyDocumentUpdate((currentDocument) => updater(currentDocument));
    },
    [onApplyDocumentUpdate],
  );

  const buildCloudSnapshot = useCallback(async () => {
    if (runtimeContext.kind !== "cloud") {
      throw new Error("Cloud snapshot requested for local notebook runtime.");
    }

    const response = await cloudApi.getProjectRunSnapshot(runtimeContext.projectId);
    const dirtyCloudFiles = new Map(
      openedFiles
        .filter(
          (
            file,
          ): file is Extract<
            (typeof openedFiles)[number],
            {
              kind: "cloud";
            }
          > => file.kind === "cloud" && file.projectId === runtimeContext.projectId,
        )
        .map((file) => [file.fileId, file.content]),
    );

    return {
      ...response.snapshot,
      files: response.snapshot.files.map((file) =>
        dirtyCloudFiles.has(file.id)
          ? {
              ...file,
              content: dirtyCloudFiles.get(file.id) ?? file.content,
            }
          : file,
      ),
    };
  }, [openedFiles, runtimeContext]);

  const buildExecutionContext = useCallback(async (): Promise<NotebookExecutionContext> => {
    if (runtimeContext.kind === "local") {
      return {
        kind: "local",
        runtimeId: runtimeContext.runtimeId,
        notebookPath: runtimeContext.notebookPath,
        workspaceRootPath: runtimeContext.workspaceRootPath ?? null,
      };
    }

    return {
      kind: "cloud",
      runtimeId: runtimeContext.runtimeId,
      editorPath: runtimeContext.editorPath,
      projectId: runtimeContext.projectId,
      fileId: runtimeContext.fileId,
      name: runtimeContext.name,
      cloudSnapshot: await buildCloudSnapshot(),
    };
  }, [buildCloudSnapshot, runtimeContext]);

  const refreshKernels = useCallback(
    async (forceRefresh = false) => {
      setState((current) => ({
        ...current,
        kernelsLoading: true,
        kernelsError: null,
      }));

      try {
        const result = forceRefresh
          ? await window.electronAPI.refreshNotebookKernels({
              workspaceRootPath:
                runtimeContext.kind === "local"
                  ? runtimeContext.workspaceRootPath ?? null
                  : null,
            })
          : await window.electronAPI.listNotebookKernels({
              workspaceRootPath:
                runtimeContext.kind === "local"
                  ? runtimeContext.workspaceRootPath ?? null
                  : null,
            });

        if (!mountedRef.current) {
          return result;
        }

        const diagnosticsMessage = result.diagnostics.find(
          (diagnostic) => diagnostic.severity === "error",
        )?.message;

        setState((current) => ({
          ...current,
          kernels: result.kernels,
          kernelsLoading: false,
          kernelsError: diagnosticsMessage ?? null,
          executionMessage: diagnosticsMessage ?? current.executionMessage,
        }));

        return result;
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Не удалось загрузить список ядер.";

        if (mountedRef.current) {
          setState((current) => ({
            ...current,
            kernels: [],
            kernelsLoading: false,
            kernelsError: message,
            executionMessage: message,
          }));
        }

        return null;
      }
    },
    [runtimeContext],
  );

  const syncNotebookKernelMetadata = useCallback(
    (kernelId: string, languageInfoName: string | null) => {
      const kernel = kernelsRef.current.find((candidate) => candidate.id === kernelId);

      if (!kernel) {
        return;
      }

      applyDocumentUpdate((currentDocument) =>
        setNotebookMetadataKernelspec(currentDocument, {
          name: kernel.id,
          display_name: kernel.displayName,
          language: languageInfoName ?? kernel.language,
        }),
      );
    },
    [applyDocumentUpdate],
  );

  const startSession = useCallback(
    async (kernelId: string) => {
      const kernel = kernelsRef.current.find((candidate) => candidate.id === kernelId);

      if (!kernel) {
        if (mountedRef.current) {
          setState((current) => ({
            ...current,
            executionMessage: "Выбранное ядро больше недоступно.",
            sessionStatus: "failed",
            sessionDetail: "Выбранное ядро больше недоступно.",
          }));
        }

        return null;
      }
      setState((current) => ({
        ...current,
        selectedKernelId: kernelId,
        sessionStatus: "starting",
        sessionDetail: "Запуск ядра...",
        executionMessage: null,
      }));

      try {
        const executionContext = await buildExecutionContext();
        const result = await window.electronAPI.startNotebookSession({
          runtimeContext: executionContext,
          kernel: {
            id: kernel.id,
            displayName: kernel.displayName,
            launchKind: kernel.launchKind,
            kernelName: kernel.kernelName,
            interpreterPath: kernel.interpreterPath,
          },
        });

        if (!mountedRef.current) {
          return result.session;
        }

        syncNotebookKernelMetadata(kernelId, result.session.languageInfoName ?? null);
        setState((current) => ({
          ...current,
          selectedKernelId: kernelId,
          sessionStatus: result.session.status,
          sessionDetail: result.session.detail,
          executionMessage: null,
        }));

        return result.session;
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Не удалось запустить ядро ноутбука.";

        if (mountedRef.current) {
          setState((current) => ({
            ...current,
            selectedKernelId: kernelId,
            sessionStatus: "failed",
            sessionDetail: message,
            executionMessage: message,
          }));
        }

        return null;
      }
    },
    [buildExecutionContext, syncNotebookKernelMetadata],
  );

  useEffect(() => {
    void refreshKernels(false);
  }, [refreshKernels]);

  useEffect(() => {
    const preferredKernelId = state.selectedKernelId;

    if (!preferredKernelId || state.kernelsLoading || state.kernels.length === 0) {
      return;
    }

    const matchingKernel = state.kernels.find((kernel) => kernel.id === preferredKernelId);

    if (!matchingKernel) {
      return;
    }

    const autoStartKey = `${runtimeContext.runtimeId}:${preferredKernelId}`;

    if (autoStartedKeyRef.current === autoStartKey) {
      return;
    }

    autoStartedKeyRef.current = autoStartKey;
    void startSession(preferredKernelId);
  }, [
    runtimeContext.runtimeId,
    startSession,
    state.kernels,
    state.kernelsLoading,
    state.selectedKernelId,
  ]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onNotebookKernelEvent((event) => {
      if (event.runtimeId !== runtimeContext.runtimeId) {
        return;
      }

      if (event.type === "session-status") {
        setState((current) => ({
          ...current,
          sessionStatus: event.status,
          sessionDetail: event.detail ?? current.sessionDetail,
          isRunningAnyCell:
            event.status === "busy"
              ? true
              : event.status === "idle"
                ? Object.values(current.cellStates).some((cell) => cell.isRunning)
                : current.isRunningAnyCell,
        }));
        return;
      }

      if (event.type === "session-error") {
        const finishedAtMs = Date.now();
        setState((current) => ({
          ...current,
          executionMessage: event.message,
          sessionStatus: "failed",
          sessionDetail: event.message,
          isRunningAnyCell: false,
          cellStates: completeRunningCellStates(current.cellStates, "error", finishedAtMs),
        }));
        return;
      }

      if (event.type === "execution-started") {
        const startedAtMs = Date.now();
        applyDocumentUpdate((currentDocument) =>
          clearNotebookCellExecution(currentDocument, event.cellId),
        );
        setState((current) => ({
          ...current,
          isRunningAnyCell: true,
          cellStates: buildRunningMap(current.cellStates, event.cellId, {
            isRunning: true,
            lastStatus: null,
            startedAtMs,
            lastDurationMs: null,
          }),
        }));
        return;
      }

      if (event.type === "output") {
        applyDocumentUpdate((currentDocument) =>
          appendNotebookCellOutput(currentDocument, event.cellId, event.output),
        );
        return;
      }

      if (event.type === "display-update") {
        applyDocumentUpdate((currentDocument) => {
          let nextDocument = currentDocument;

          for (const target of event.targets) {
            nextDocument = patchNotebookCellOutput(
              nextDocument,
              target.cellId,
              target.outputIndex,
              event.output,
            );
          }

          return nextDocument;
        });
        return;
      }

      if (event.type === "execution-finished") {
        const finishedAtMs = Date.now();
        applyDocumentUpdate((currentDocument) =>
          replaceNotebookCellOutputs(
            currentDocument,
            event.cellId,
            event.outputs,
            event.executionCount,
          ),
        );
        setState((current) => {
          const previousState = current.cellStates[event.cellId];
          const nextCellStates = buildRunningMap(current.cellStates, event.cellId, {
            isRunning: false,
            lastStatus: event.status,
            startedAtMs: null,
            lastDurationMs:
              previousState?.startedAtMs != null
                ? Math.max(0, finishedAtMs - previousState.startedAtMs)
                : previousState?.lastDurationMs ?? null,
          });

          return {
            ...current,
            isRunningAnyCell: Object.values(nextCellStates).some((cell) => cell.isRunning),
            cellStates: nextCellStates,
            executionMessage:
              event.status === "ok"
                ? current.executionMessage
                : event.status === "interrupted"
                  ? "Выполнение прервано."
                  : current.executionMessage,
          };
        });
      }
    });

    return unsubscribe;
  }, [applyDocumentUpdate, runtimeContext.runtimeId]);

  const ensureSessionReady = useCallback(async () => {
    const kernelId = selectedKernelIdRef.current;

    if (!kernelId) {
      setState((current) => ({
        ...current,
        executionMessage:
          "Выберите ядро Jupyter для выполнения ноутбука.",
      }));
      return null;
    }

    if (state.sessionStatus === "idle" || state.sessionStatus === "busy") {
      return kernelId;
    }

    const session = await startSession(kernelId);
    return session ? kernelId : null;
  }, [startSession, state.sessionStatus]);

  const runCell = useCallback(
    async (cellId: string) => {
      if (runAllInProgressRef.current || state.isRunningAnyCell) {
        return null;
      }

      const targetCell = documentRef.current.cells.find(
        (cell) => cell.localId === cellId && cell.cellType === "code",
      );

      if (!targetCell) {
        return null;
      }

      const kernelId = await ensureSessionReady();

      if (!kernelId) {
        return null;
      }

      try {
        return await window.electronAPI.executeNotebookCell({
          runtimeId: runtimeContext.runtimeId,
          cellId,
          source: targetCell.source,
        });
      } catch (error) {
        const finishedAtMs = Date.now();
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Не удалось выполнить ячейку.";

        if (mountedRef.current) {
          setState((current) => {
            const previousState = current.cellStates[cellId];

            return {
              ...current,
              executionMessage: message,
              sessionStatus: "failed",
              sessionDetail: message,
              isRunningAnyCell: false,
              cellStates: buildRunningMap(current.cellStates, cellId, {
                isRunning: false,
                lastStatus: "error",
                startedAtMs: null,
                lastDurationMs:
                  previousState?.startedAtMs != null
                    ? Math.max(0, finishedAtMs - previousState.startedAtMs)
                    : previousState?.lastDurationMs ?? null,
              }),
            };
          });
        }

        return null;
      }
    },
    [ensureSessionReady, runtimeContext.runtimeId, state.isRunningAnyCell],
  );

  const runAll = useCallback(async () => {
    if (runAllInProgressRef.current || state.isRunningAnyCell) {
      return;
    }

    const kernelId = await ensureSessionReady();

    if (!kernelId) {
      return;
    }

    runAllInProgressRef.current = true;

    try {
      const codeCells = documentRef.current.cells.filter((cell) => cell.cellType === "code");

      for (const cell of codeCells) {
        const result = await window.electronAPI.executeNotebookCell({
          runtimeId: runtimeContext.runtimeId,
          cellId: cell.localId,
          source:
            documentRef.current.cells.find((candidate) => candidate.localId === cell.localId)?.source ??
            cell.source,
        });

        if (!result || result.status !== "ok") {
          break;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось выполнить ноутбук.";

      if (mountedRef.current) {
        setState((current) => ({
          ...current,
          executionMessage: message,
          sessionStatus: "failed",
          sessionDetail: message,
        }));
      }
    } finally {
      runAllInProgressRef.current = false;
    }
  }, [ensureSessionReady, runtimeContext.runtimeId, state.isRunningAnyCell]);

  const interruptKernel = useCallback(async () => {
    try {
      await window.electronAPI.interruptNotebookKernel(runtimeContext.runtimeId);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось прервать ядро.";

      if (mountedRef.current) {
        setState((current) => ({
          ...current,
          executionMessage: message,
          sessionStatus: "failed",
          sessionDetail: message,
        }));
      }
    }
  }, [runtimeContext.runtimeId]);

  const restartKernel = useCallback(async () => {
    if (state.isRunningAnyCell) {
      return;
    }

    try {
      const result = await window.electronAPI.restartNotebookKernel(runtimeContext.runtimeId);
      syncNotebookKernelMetadata(result.session.kernelId, result.session.languageInfoName ?? null);
      setState((current) => ({
        ...current,
        sessionStatus: result.session.status,
        sessionDetail: result.session.detail,
        executionMessage: null,
        cellStates: {},
        isRunningAnyCell: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось перезапустить ядро.";

      if (mountedRef.current) {
        setState((current) => ({
          ...current,
          executionMessage: message,
          sessionStatus: "failed",
          sessionDetail: message,
        }));
      }
    }
  }, [runtimeContext.runtimeId, state.isRunningAnyCell, syncNotebookKernelMetadata]);

  const selectKernel = useCallback(
    async (kernelId: string) => {
      await startSession(kernelId);
    },
    [startSession],
  );

  const canExecute = useMemo(
    () =>
      Boolean(state.selectedKernelId) &&
      !state.kernelsLoading &&
      state.sessionStatus !== "starting" &&
      state.sessionStatus !== "restarting" &&
      state.sessionStatus !== "interrupting",
    [state.kernelsLoading, state.selectedKernelId, state.sessionStatus],
  );

  return {
    ...state,
    canExecute,
    isRunAllInProgress: runAllInProgressRef.current,
    refreshKernels: () => refreshKernels(true),
    selectKernel,
    runCell,
    runAll,
    interruptKernel,
    restartKernel,
  };
}
