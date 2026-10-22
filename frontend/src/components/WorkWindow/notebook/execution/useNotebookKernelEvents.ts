import { useEffect, type Dispatch, type SetStateAction } from "react";
import {
  appendNotebookCellOutput,
  clearNotebookCellExecution,
  patchNotebookCellOutput,
  replaceNotebookCellOutputs,
} from "../notebookDocument";
import type { NotebookDocumentModel } from "../types";
import { buildRunningMap, completeRunningCellStates } from "./notebookExecutionState";
import type { NotebookExecutionViewState } from "./types";

type UseNotebookKernelEventsOptions = {
  applyDocumentUpdate: (
    updater: (document: NotebookDocumentModel) => NotebookDocumentModel,
  ) => void;
  runtimeId: string;
  setState: Dispatch<SetStateAction<NotebookExecutionViewState>>;
};

export function useNotebookKernelEvents({
  applyDocumentUpdate,
  runtimeId,
  setState,
}: UseNotebookKernelEventsOptions) {
  useEffect(() => {
    const unsubscribe = window.electronAPI.onNotebookKernelEvent((event) => {
      if (event.runtimeId !== runtimeId) {
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
      } else if (event.type === "session-error") {
        const finishedAtMs = Date.now();
        setState((current) => ({
          ...current,
          executionMessage: event.message,
          sessionStatus: "failed",
          sessionDetail: event.message,
          isRunningAnyCell: false,
          cellStates: completeRunningCellStates(current.cellStates, "error", finishedAtMs),
        }));
      } else if (event.type === "execution-started") {
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
      } else if (event.type === "output") {
        applyDocumentUpdate((currentDocument) =>
          appendNotebookCellOutput(currentDocument, event.cellId, event.output),
        );
      } else if (event.type === "display-update") {
        applyDocumentUpdate((currentDocument) =>
          event.targets.reduce(
            (nextDocument, target) =>
              patchNotebookCellOutput(
                nextDocument,
                target.cellId,
                target.outputIndex,
                event.output,
              ),
            currentDocument,
          ),
        );
      } else if (event.type === "execution-finished") {
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
              event.status === "interrupted" ? "Выполнение прервано." : current.executionMessage,
          };
        });
      }
    });

    return unsubscribe;
  }, [applyDocumentUpdate, runtimeId, setState]);
}
