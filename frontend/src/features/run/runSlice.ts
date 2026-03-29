import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  RunConfiguration,
  RunConfigurationListResult,
  RunCppToolchainDescriptor,
  RunPythonInterpreterDescriptor,
  RunSession,
} from "./runTypes";

type RunState = {
  workspaceKey: string | null;
  selectedConfigId: string | null;
  configurations: RunConfiguration[];
  currentSession: RunSession | null;
  sessionHistory: RunSession[];
  interpreters: RunPythonInterpreterDescriptor[];
  toolchains: RunCppToolchainDescriptor[];
  isConfigurationDialogOpen: boolean;
  configurationsLoading: boolean;
  toolsLoading: boolean;
  errorMessage: string | null;
};

const initialState: RunState = {
  workspaceKey: null,
  selectedConfigId: null,
  configurations: [],
  currentSession: null,
  sessionHistory: [],
  interpreters: [],
  toolchains: [],
  isConfigurationDialogOpen: false,
  configurationsLoading: false,
  toolsLoading: false,
  errorMessage: null,
};

function upsertSessionHistory(history: RunSession[], session: RunSession) {
  const nextHistory = [session, ...history.filter((item) => item.id !== session.id)];
  return nextHistory.slice(0, 12);
}

const runSlice = createSlice({
  name: "run",
  initialState,
  reducers: {
    runConfigurationsLoading(state) {
      state.configurationsLoading = true;
      state.errorMessage = null;
    },
    runConfigurationsLoaded(state, action: PayloadAction<RunConfigurationListResult>) {
      state.configurationsLoading = false;
      state.workspaceKey = action.payload.workspaceKey;
      state.selectedConfigId = action.payload.selectedConfigId;
      state.configurations = action.payload.configurations;
      state.errorMessage = null;
    },
    runConfigurationsFailed(state, action: PayloadAction<string>) {
      state.configurationsLoading = false;
      state.errorMessage = action.payload;
    },
    runConfigurationDialogOpened(state) {
      state.isConfigurationDialogOpen = true;
    },
    runConfigurationDialogClosed(state) {
      state.isConfigurationDialogOpen = false;
    },
    runToolsLoading(state) {
      state.toolsLoading = true;
      state.errorMessage = null;
    },
    runToolsLoaded(
      state,
      action: PayloadAction<{
        interpreters: RunPythonInterpreterDescriptor[];
        toolchains: RunCppToolchainDescriptor[];
      }>,
    ) {
      state.toolsLoading = false;
      state.interpreters = action.payload.interpreters;
      state.toolchains = action.payload.toolchains;
      state.errorMessage = null;
    },
    runToolsFailed(state, action: PayloadAction<string>) {
      state.toolsLoading = false;
      state.errorMessage = action.payload;
    },
    runErrorMessageSet(state, action: PayloadAction<string | null>) {
      state.errorMessage = action.payload;
    },
    runSelectedConfigurationChanged(state, action: PayloadAction<string | null>) {
      state.selectedConfigId = action.payload;
    },
    runSessionChanged(state, action: PayloadAction<RunSession>) {
      state.currentSession = action.payload;
      state.sessionHistory = upsertSessionHistory(state.sessionHistory, action.payload);
    },
    runSessionCleared(state) {
      state.currentSession = null;
    },
    runErrorMessageCleared(state) {
      state.errorMessage = null;
    },
  },
});

export const {
  runConfigurationsLoading,
  runConfigurationsLoaded,
  runConfigurationsFailed,
  runConfigurationDialogOpened,
  runConfigurationDialogClosed,
  runToolsLoading,
  runToolsLoaded,
  runToolsFailed,
  runErrorMessageSet,
  runSelectedConfigurationChanged,
  runSessionChanged,
  runSessionCleared,
  runErrorMessageCleared,
} = runSlice.actions;

export default runSlice.reducer;
