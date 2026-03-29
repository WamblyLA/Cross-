import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type TerminalState = {
  terminalId: string | null;
  isReady: boolean;
  title: string | null;
  shellLabel: string | null;
};

const initialState: TerminalState = {
  terminalId: null,
  isReady: false,
  title: null,
  shellLabel: null,
};

const terminalSlice = createSlice({
  name: "terminal",
  initialState,
  reducers: {
    terminalSessionReady(
      state,
      action: PayloadAction<{
        terminalId: string;
        title: string;
        shellLabel: string;
      }>,
    ) {
      state.terminalId = action.payload.terminalId;
      state.isReady = true;
      state.title = action.payload.title;
      state.shellLabel = action.payload.shellLabel;
    },
    terminalSessionClosed(state, action: PayloadAction<{ terminalId: string }>) {
      if (state.terminalId !== action.payload.terminalId) {
        return;
      }

      state.terminalId = null;
      state.isReady = false;
      state.title = null;
      state.shellLabel = null;
    },
  },
});

export const { terminalSessionReady, terminalSessionClosed } = terminalSlice.actions;

export default terminalSlice.reducer;
