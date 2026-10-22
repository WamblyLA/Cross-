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

function beginAuthentication(state: AuthState) {
  state.authPending = true;
  state.settingsPending = true;
  state.actionError = null;
  state.sessionError = null;
}

function applyAuthenticatedSession(
  state: AuthState,
  session: {
    user: NonNullable<AuthState["user"]>;
    settings: NonNullable<AuthState["settings"]>;
  },
) {
  state.sessionStatus = "authenticated";
  state.user = session.user;
  state.settings = session.settings;
  state.authPending = false;
  state.settingsPending = false;
  state.sessionError = null;
  state.actionError = null;
}

function applyAnonymousSession(state: AuthState) {
  state.sessionStatus = "anonymous";
  state.user = null;
  state.settings = null;
  state.authPending = false;
  state.settingsPending = false;
  state.sessionError = null;
  state.actionError = null;
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
        applyAuthenticatedSession(state, action.payload);
      })
      .addCase(restoreSession.rejected, (state, action) => {
        const error = resolveError(action.payload, "Не удалось восстановить сессию.");

        applyAnonymousSession(state);
        state.sessionError = error.status === 401 ? null : error;
      })
      .addCase(login.pending, (state) => {
        beginAuthentication(state);
      })
      .addCase(login.fulfilled, (state, action) => {
        applyAuthenticatedSession(state, action.payload);
      })
      .addCase(login.rejected, (state, action) => {
        applyAnonymousSession(state);
        state.actionError = resolveError(action.payload, "Не удалось выполнить вход.");
      })
      .addCase(register.pending, (state) => {
        beginAuthentication(state);
      })
      .addCase(register.fulfilled, (state, action) => {
        applyAuthenticatedSession(state, action.payload);
      })
      .addCase(register.rejected, (state, action) => {
        applyAnonymousSession(state);
        state.actionError = resolveError(action.payload, "Не удалось создать аккаунт.");
      })
      .addCase(logout.pending, (state) => {
        state.authPending = true;
        state.actionError = null;
      })
      .addCase(logout.fulfilled, (state) => {
        applyAnonymousSession(state);
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
