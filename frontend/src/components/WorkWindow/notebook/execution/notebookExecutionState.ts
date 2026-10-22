import type { NotebookDocumentModel } from "../types";
import type { NotebookExecutionViewState } from "./types";

export const INITIAL_NOTEBOOK_EXECUTION_STATE: NotebookExecutionViewState = {
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

export function getPreferredKernelId(document: NotebookDocumentModel) {
  const metadata = isRecord(document.raw.metadata) ? document.raw.metadata : null;
  const kernelspec = metadata && isRecord(metadata.kernelspec) ? metadata.kernelspec : null;
  const name = kernelspec?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function buildRunningMap(
  cellStates: NotebookExecutionViewState["cellStates"],
  targetCellId: string,
  nextState: NotebookExecutionViewState["cellStates"][string],
) {
  return { ...cellStates, [targetCellId]: nextState };
}

export function completeRunningCellStates(
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
