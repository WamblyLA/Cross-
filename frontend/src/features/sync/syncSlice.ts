import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { logout, restoreSession } from "../auth/authThunks";
import type {
  LinkedWorkspaceBinding,
  SyncOperation,
  SyncPreview,
  SyncState,
} from "./syncTypes";

const initialState: SyncState = {
  bindings: [],
  bindingsStatus: "idle",
  bindingsError: null,
  preview: null,
  previewDialogOpen: false,
  previewStatus: "idle",
  previewError: null,
  operation: null,
  operationStatus: "idle",
  operationError: null,
};

const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    bindingsLoading(state) {
      state.bindingsStatus = "loading";
      state.bindingsError = null;
    },
    bindingsLoaded(state, action: PayloadAction<LinkedWorkspaceBinding[]>) {
      state.bindings = action.payload;
      state.bindingsStatus = "succeeded";
      state.bindingsError = null;
    },
    bindingsFailed(state, action: PayloadAction<string>) {
      state.bindingsStatus = "failed";
      state.bindingsError = action.payload;
    },
    upsertBinding(state, action: PayloadAction<LinkedWorkspaceBinding>) {
      const nextBinding = action.payload;
      const nextBindings = state.bindings.filter((item) => item.id !== nextBinding.id);
      nextBindings.unshift(nextBinding);
      state.bindings = nextBindings;
      state.bindingsStatus = "succeeded";
      state.bindingsError = null;
    },
    setBindingStatus(
      state,
      action: PayloadAction<{
        bindingId: string;
        status: LinkedWorkspaceBinding["status"];
      }>,
    ) {
      const existing = state.bindings.find((binding) => binding.id === action.payload.bindingId);

      if (existing) {
        existing.status = action.payload.status;
      }
    },
    removeBinding(state, action: PayloadAction<string>) {
      state.bindings = state.bindings.filter((item) => item.id !== action.payload);
      state.bindingsStatus = "succeeded";
      state.bindingsError = null;
      if (state.preview?.bindingId === action.payload) {
        state.preview = null;
        state.previewDialogOpen = false;
        state.previewStatus = "idle";
        state.previewError = null;
      }
    },
    previewStarted(state) {
      state.previewStatus = "loading";
      state.previewError = null;
    },
    previewReady(state, action: PayloadAction<SyncPreview>) {
      state.preview = action.payload;
      state.previewStatus = "succeeded";
      state.previewError = null;
    },
    previewFailed(state, action: PayloadAction<string>) {
      state.previewDialogOpen = false;
      state.previewStatus = "failed";
      state.previewError = action.payload;
    },
    openPreviewDialog(state) {
      state.previewDialogOpen = Boolean(state.preview);
    },
    closePreviewDialog(state) {
      state.previewDialogOpen = false;
    },
    clearPreview(state) {
      state.preview = null;
      state.previewDialogOpen = false;
      state.previewStatus = "idle";
      state.previewError = null;
    },
    operationStarted(state, action: PayloadAction<SyncOperation>) {
      state.operation = action.payload;
      state.operationStatus = "loading";
      state.operationError = null;
    },
    operationSucceeded(state, action: PayloadAction<SyncOperation>) {
      state.operation = action.payload;
      state.operationStatus = "succeeded";
      state.operationError = null;
    },
    operationFailed(state, action: PayloadAction<{ operation: SyncOperation; error: string }>) {
      state.operation = action.payload.operation;
      state.operationStatus = "failed";
      state.operationError = action.payload.error;
    },
    clearSyncState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout.fulfilled, () => initialState)
      .addCase(restoreSession.rejected, () => initialState);
  },
});

export const {
  bindingsLoading,
  bindingsLoaded,
  bindingsFailed,
  upsertBinding,
  setBindingStatus,
  removeBinding,
  previewStarted,
  previewReady,
  previewFailed,
  openPreviewDialog,
  closePreviewDialog,
  clearPreview,
  operationStarted,
  operationSucceeded,
  operationFailed,
  clearSyncState,
} = syncSlice.actions;

export default syncSlice.reducer;
