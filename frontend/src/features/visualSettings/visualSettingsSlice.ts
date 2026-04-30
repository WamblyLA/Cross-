import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createApiError } from "../../lib/api/errorNormalization";
import { loadAccountVisualSettings, syncVisualSettingsToAccount } from "./visualSettingsThunks";
import { readStoredVisualSettings, normalizeVisualSettings } from "./visualSettingsStorage";
import type { VisualSettings, VisualSettingsState } from "./visualSettingsTypes";

const initialState: VisualSettingsState = {
  current: readStoredVisualSettings(),
  accountSettings: null,
  syncPending: false,
  loadPending: false,
  actionError: null,
};

const visualSettingsSlice = createSlice({
  name: "visualSettings",
  initialState,
  reducers: {
    applyVisualSettings(state, action: PayloadAction<Partial<VisualSettings>>) {
      state.current = normalizeVisualSettings({
        ...state.current,
        ...action.payload,
      });
      state.actionError = null;
    },
    replaceVisualSettings(state, action: PayloadAction<VisualSettings>) {
      state.current = normalizeVisualSettings(action.payload);
      state.actionError = null;
    },
    hydrateAccountVisualSettings(state, action: PayloadAction<VisualSettings | null>) {
      state.accountSettings = action.payload ? normalizeVisualSettings(action.payload) : null;
    },
    clearVisualSettingsError(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncVisualSettingsToAccount.pending, (state) => {
        state.syncPending = true;
        state.actionError = null;
      })
      .addCase(syncVisualSettingsToAccount.fulfilled, (state, action) => {
        state.syncPending = false;
        state.accountSettings = normalizeVisualSettings(action.payload);
        state.actionError = null;
      })
      .addCase(syncVisualSettingsToAccount.rejected, (state, action) => {
        state.syncPending = false;
        state.actionError =
          action.payload ?? createApiError("Не удалось синхронизировать настройки");
      })
      .addCase(loadAccountVisualSettings.pending, (state) => {
        state.loadPending = true;
        state.actionError = null;
      })
      .addCase(loadAccountVisualSettings.fulfilled, (state, action) => {
        const nextSettings = normalizeVisualSettings(action.payload);
        state.loadPending = false;
        state.accountSettings = nextSettings;
        state.current = nextSettings;
        state.actionError = null;
      })
      .addCase(loadAccountVisualSettings.rejected, (state, action) => {
        state.loadPending = false;
        state.actionError =
          action.payload ?? createApiError("Не удалось загрузить настройки");
      });
  },
});

export const {
  applyVisualSettings,
  replaceVisualSettings,
  hydrateAccountVisualSettings,
  clearVisualSettingsError,
} = visualSettingsSlice.actions;

export default visualSettingsSlice.reducer;
