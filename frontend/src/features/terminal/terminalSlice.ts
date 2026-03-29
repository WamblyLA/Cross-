import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type TerminalSessionMeta = {
  id: string;
  title: string;
  shellLabel: string;
  kind: "shell";
};

type TerminalState = {
  activeTerminalId: string | null;
  sessions: TerminalSessionMeta[];
  isReady: boolean;
};

const initialState: TerminalState = {
  activeTerminalId: null,
  sessions: [],
  isReady: false,
};

function resolveNextActiveTerminalId(
  sessions: TerminalSessionMeta[],
  preferredTerminalId: string | null,
) {
  if (
    preferredTerminalId &&
    sessions.some((session) => session.id === preferredTerminalId)
  ) {
    return preferredTerminalId;
  }

  return sessions[0]?.id ?? null;
}

const terminalSlice = createSlice({
  name: "terminal",
  initialState,
  reducers: {
    terminalSessionsLoaded(
      state,
      action: PayloadAction<{
        terminals: TerminalSessionMeta[];
        activeTerminalId?: string | null;
      }>,
    ) {
      state.sessions = action.payload.terminals;
      state.activeTerminalId = resolveNextActiveTerminalId(
        action.payload.terminals,
        action.payload.activeTerminalId ?? state.activeTerminalId,
      );
      state.isReady = Boolean(state.activeTerminalId);
    },
    terminalSessionReady(
      state,
      action: PayloadAction<{
        terminal: TerminalSessionMeta;
      }>,
    ) {
      const nextTerminal = action.payload.terminal;
      const existingIndex = state.sessions.findIndex(
        (session) => session.id === nextTerminal.id,
      );

      if (existingIndex === -1) {
        state.sessions.push(nextTerminal);
      } else {
        state.sessions[existingIndex] = nextTerminal;
      }

      state.activeTerminalId = nextTerminal.id;
      state.isReady = true;
    },
    terminalSessionActivated(
      state,
      action: PayloadAction<{ terminalId: string }>,
    ) {
      if (
        !state.sessions.some(
          (session) => session.id === action.payload.terminalId,
        )
      ) {
        return;
      }

      state.activeTerminalId = action.payload.terminalId;
      state.isReady = true;
    },
    terminalSessionClosed(
      state,
      action: PayloadAction<{ terminalId: string }>,
    ) {
      state.sessions = state.sessions.filter(
        (session) => session.id !== action.payload.terminalId,
      );
      state.activeTerminalId = resolveNextActiveTerminalId(
        state.sessions,
        state.activeTerminalId,
      );
      state.isReady = Boolean(state.activeTerminalId);
    },
  },
});

export const {
  terminalSessionsLoaded,
  terminalSessionReady,
  terminalSessionActivated,
  terminalSessionClosed,
} = terminalSlice.actions;

export default terminalSlice.reducer;
