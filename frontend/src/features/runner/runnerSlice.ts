import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type RunnerState = {
  isVisible: boolean;
  isReady: boolean;
  isRunning: boolean;
  shellLabel: string | null;
  activeInterpreter: string | null;
  activeRunFilePath: string | null;
  lastExitCode: number | null;
};

const initialState: RunnerState = {
  isVisible: false,
  isReady: false,
  isRunning: false,
  shellLabel: null,
  activeInterpreter: null,
  activeRunFilePath: null,
  lastExitCode: null,
};

const runnerSlice = createSlice({
  name: "runner",
  initialState,
  reducers: {
    setTerminalVisible(state, action: PayloadAction<boolean>) {
      state.isVisible = action.payload;
    },
    toggleTerminalVisible(state) {
      state.isVisible = !state.isVisible;
    },
    terminalReady(state, action: PayloadAction<{ shellLabel: string }>) {
      state.isReady = true;
      state.shellLabel = action.payload.shellLabel;
    },
    terminalClosed(state) {
      state.isVisible = false;
      state.isReady = false;
      state.isRunning = false;
      state.shellLabel = null;
      state.activeInterpreter = null;
      state.activeRunFilePath = null;
      state.lastExitCode = null;
    },
    terminalRunStarted(
      state,
      action: PayloadAction<{
        filePath: string;
        interpreter: string;
      }>,
    ) {
      state.isVisible = true;
      state.isReady = true;
      state.isRunning = true;
      state.activeRunFilePath = action.payload.filePath;
      state.activeInterpreter = action.payload.interpreter;
      state.lastExitCode = null;
    },
    terminalRunFinished(state, action: PayloadAction<{ exitCode: number }>) {
      state.isRunning = false;
      state.lastExitCode = action.payload.exitCode;
    },
  },
});

export const {
  setTerminalVisible,
  toggleTerminalVisible,
  terminalReady,
  terminalClosed,
  terminalRunStarted,
  terminalRunFinished,
} = runnerSlice.actions;

export default runnerSlice.reducer;
