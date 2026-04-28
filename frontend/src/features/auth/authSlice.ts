import { createSlice } from "@reduxjs/toolkit";
import { createApiError, type ApiError } from "../../lib/api/errorNormalization";
import {
  login,
  logout,
  register,
  restoreSession,
  updateProfile,
  updateSettings,
} from "./authThunks";
import type { AuthState } from "./authTypes";

const initialState: AuthState = {
  sessionStatus: "idle",
  user: null,
  settings: null,
  authPending: false,
  settingsPending: false,
  sessionError: null,
  actionError: null,
};

function resolveError(error: ApiError | undefined, fallbackMessage: string): ApiError {
  return error ?? createApiError(fallbackMessage);
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearActionError(state) {
      state.actionError = null;
    },
    clearSessionError(state) {
      state.sessionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.sessionStatus = "checking";
        state.settingsPending = true;
        state.sessionError = null;
        state.actionError = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.sessionStatus = "authenticated";
        state.user = action.payload.user;
        state.settings = action.payload.settings;
        state.authPending = false;
        state.settingsPending = false;
        state.sessionError = null;
        state.actionError = null;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        const error = resolveError(action.payload, "Не удалось восстановить сессию.");

        state.sessionStatus = "anonymous";
        state.user = null;
        state.settings = null;
        state.authPending = false;
        state.settingsPending = false;
        state.actionError = null;
        state.sessionError = error.status === 401 ? null : error;
      })
      .addCase(login.pending, (state) => {
        state.authPending = true;
        state.settingsPending = true;
        state.actionError = null;
        state.sessionError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.sessionStatus = "authenticated";
        state.user = action.payload.user;
        state.settings = action.payload.settings;
        state.authPending = false;
        state.settingsPending = false;
        state.actionError = null;
        state.sessionError = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.sessionStatus = "anonymous";
        state.user = null;
        state.settings = null;
        state.authPending = false;
        state.settingsPending = false;
        state.actionError = resolveError(action.payload, "Не удалось выполнить вход.");
      })
      .addCase(register.pending, (state) => {
        state.authPending = true;
        state.settingsPending = true;
        state.actionError = null;
        state.sessionError = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.sessionStatus = "authenticated";
        state.user = action.payload.user;
        state.settings = action.payload.settings;
        state.authPending = false;
        state.settingsPending = false;
        state.actionError = null;
        state.sessionError = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.sessionStatus = "anonymous";
        state.user = null;
        state.settings = null;
        state.authPending = false;
        state.settingsPending = false;
        state.actionError = resolveError(action.payload, "Не удалось создать аккаунт.");
      })
      .addCase(logout.pending, (state) => {
        state.authPending = true;
        state.actionError = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.sessionStatus = "anonymous";
        state.user = null;
        state.settings = null;
        state.authPending = false;
        state.settingsPending = false;
        state.sessionError = null;
        state.actionError = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.authPending = false;
        state.actionError = resolveError(action.payload, "Не удалось выполнить выход.");
      })
      .addCase(updateProfile.pending, (state) => {
        state.authPending = true;
        state.actionError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.authPending = false;
        state.user = action.payload;
        state.actionError = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.authPending = false;
        state.actionError = resolveError(action.payload, "Не удалось сохранить профиль.");
      })
      .addCase(updateSettings.pending, (state) => {
        state.settingsPending = true;
        state.actionError = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settingsPending = false;
        state.settings = action.payload;
        state.actionError = null;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.settingsPending = false;
        state.actionError = resolveError(action.payload, "Не удалось сохранить настройки.");
      });
  },
});

export const { clearActionError, clearSessionError } = authSlice.actions;

export default authSlice.reducer;
