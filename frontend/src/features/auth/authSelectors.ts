import type { StateType } from "../../store/store";

export const selectAuthState = (state: StateType) => state.auth;
export const selectSessionStatus = (state: StateType) => state.auth.sessionStatus;
export const selectAuthUser = (state: StateType) => state.auth.user;
export const selectAuthSettings = (state: StateType) => state.auth.settings;
export const selectAuthPending = (state: StateType) => state.auth.authPending;
export const selectSettingsPending = (state: StateType) => state.auth.settingsPending;
export const selectSessionError = (state: StateType) => state.auth.sessionError;
export const selectActionError = (state: StateType) => state.auth.actionError;
export const selectIsAuthenticated = (state: StateType) =>
  state.auth.sessionStatus === "authenticated";
export const selectAuthDisplayName = (state: StateType) =>
  state.auth.user?.username ?? state.auth.user?.email ?? null;
