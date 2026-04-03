import type { StateType } from "../../store/store";

export const selectSyncState = (state: StateType) => state.sync;
export const selectSyncBindings = (state: StateType) => state.sync.bindings;
export const selectSyncBindingsStatus = (state: StateType) => state.sync.bindingsStatus;
export const selectSyncBindingsError = (state: StateType) => state.sync.bindingsError;
export const selectSyncPreview = (state: StateType) => state.sync.preview;
export const selectSyncPreviewStatus = (state: StateType) => state.sync.previewStatus;
export const selectSyncPreviewError = (state: StateType) => state.sync.previewError;
export const selectSyncOperationStatus = (state: StateType) => state.sync.operationStatus;
export const selectSyncOperationError = (state: StateType) => state.sync.operationError;
export const selectSyncBindingById = (state: StateType, bindingId: string | null) =>
  bindingId ? state.sync.bindings.find((binding) => binding.id === bindingId) ?? null : null;
