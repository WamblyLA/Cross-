import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeApiError, type ApiError } from "../../lib/api/errorNormalization";
import type { StateType } from "../../store/store";
import * as authApi from "../auth/authApi";
import type { VisualSettings } from "./visualSettingsTypes";

type VisualSettingsThunkConfig = {
  state: StateType;
  rejectValue: ApiError;
};

export const syncVisualSettingsToAccount = createAsyncThunk<
  VisualSettings,
  void,
  VisualSettingsThunkConfig
>("visualSettings/syncToAccount", async (_, { getState, rejectWithValue }) => {
  try {
    const { settings } = await authApi.updateSettings(getState().visualSettings.current);
    return settings;
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const loadAccountVisualSettings = createAsyncThunk<
  VisualSettings,
  void,
  VisualSettingsThunkConfig
>("visualSettings/loadFromAccount", async (_, { rejectWithValue }) => {
  try {
    const { settings } = await authApi.fetchSettings();
    return settings;
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});
