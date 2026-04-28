import {
  selectActionError,
  selectAuthDisplayName,
  selectAuthPending,
  selectAuthSettings,
  selectAuthUser,
  selectIsAuthenticated,
  selectSessionError,
  selectSessionStatus,
  selectSettingsPending,
} from "../features/auth/authSelectors";
import { clearActionError, clearSessionError } from "../features/auth/authSlice";
import {
  login as loginThunk,
  logout as logoutThunk,
  register as registerThunk,
  restoreSession as restoreSessionThunk,
  updateProfile as updateProfileThunk,
  updateSettings as updateSettingsThunk,
} from "../features/auth/authThunks";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function useAuth() {
  const dispatch = useAppDispatch();
  const sessionStatus = useAppSelector(selectSessionStatus);
  const user = useAppSelector(selectAuthUser);
  const settings = useAppSelector(selectAuthSettings);
  const authPending = useAppSelector(selectAuthPending);
  const settingsPending = useAppSelector(selectSettingsPending);
  const sessionError = useAppSelector(selectSessionError);
  const actionError = useAppSelector(selectActionError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const displayName = useAppSelector(selectAuthDisplayName);

  return {
    sessionStatus,
    user,
    settings,
    authPending,
    settingsPending,
    sessionError,
    actionError,
    isAuthenticated,
    displayName,
    restoreSession: () => dispatch(restoreSessionThunk()),
    login: (payload: Parameters<typeof loginThunk>[0]) => dispatch(loginThunk(payload)),
    register: (payload: Parameters<typeof registerThunk>[0]) => dispatch(registerThunk(payload)),
    logout: () => dispatch(logoutThunk()),
    updateProfile: (payload: Parameters<typeof updateProfileThunk>[0]) =>
      dispatch(updateProfileThunk(payload)),
    updateSettings: (payload: Parameters<typeof updateSettingsThunk>[0]) =>
      dispatch(updateSettingsThunk(payload)),
    clearActionError: () => dispatch(clearActionError()),
    clearSessionError: () => dispatch(clearSessionError()),
  };
}
