import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeApiError, type ApiError } from "../../lib/api/errorNormalization";
import type { StateType } from "../../store/store";
import * as authApi from "./authApi";
import type {
  AuthSettings,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UpdateSettingsPayload,
} from "./authTypes";

type AuthThunkConfig = {
  state: StateType;
  rejectValue: ApiError;
};

type AuthenticatedSession = {
  user: AuthUser;
  settings: AuthSettings;
};

export const restoreSession = createAsyncThunk<AuthenticatedSession, void, AuthThunkConfig>(
  "auth/restoreSession",
  async (_, { rejectWithValue }) => {
    try {
      const { user } = await authApi.fetchMe();
      const { settings } = await authApi.fetchSettings();

      return {
        user,
        settings,
      };
    } catch (error) {
      return rejectWithValue(normalizeApiError(error));
    }
  },
  {
    condition: (_, { getState }) => getState().auth.sessionStatus === "idle",
  },
);

export const login = createAsyncThunk<AuthenticatedSession, LoginPayload, AuthThunkConfig>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const { user } = await authApi.login(payload);
      const { settings } = await authApi.fetchSettings();

      return {
        user,
        settings,
      };
    } catch (error) {
      return rejectWithValue(normalizeApiError(error));
    }
  },
);

export const register = createAsyncThunk<AuthenticatedSession, RegisterPayload, AuthThunkConfig>(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      const { user } = await authApi.register(payload);
      const { settings } = await authApi.fetchSettings();

      return {
        user,
        settings,
      };
    } catch (error) {
      return rejectWithValue(normalizeApiError(error));
    }
  },
);

export const logout = createAsyncThunk<void, void, AuthThunkConfig>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
    } catch (error) {
      return rejectWithValue(normalizeApiError(error));
    }
  },
);

export const updateSettings = createAsyncThunk<AuthSettings, UpdateSettingsPayload, AuthThunkConfig>(
  "auth/updateSettings",
  async (payload, { rejectWithValue }) => {
    try {
      const { settings } = await authApi.updateSettings(payload);
      return settings;
    } catch (error) {
      return rejectWithValue(normalizeApiError(error));
    }
  },
);
