export type NotebookCellExecutionState = {
  isRunning: boolean;
  lastStatus: NotebookExecutionStatus | null;
};

export type NotebookExecutionViewState = {
  kernels: NotebookKernelDescriptor[];
  kernelsLoading: boolean;
  kernelsError: string | null;
  selectedKernelId: string | null;
  sessionStatus: NotebookSessionStatus;
  sessionDetail: string | null;
  executionMessage: string | null;
  isRunningAnyCell: boolean;
  cellStates: Record<string, NotebookCellExecutionState>;
};
