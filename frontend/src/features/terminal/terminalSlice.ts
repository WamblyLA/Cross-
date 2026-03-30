import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type TerminalState = {
  activeTerminalId: string | null;
  sessions: TerminalMeta[];
  isReady: boolean;
  profiles: TerminalProfileDescriptor[];
  defaultProfileId: string | null;
  profileDiscoveryStatus: TerminalProfileDiscoveryStatus;
};

const initialState: TerminalState = {
  activeTerminalId: null,
  sessions: [],
  isReady: false,
  profiles: [],
  defaultProfileId: null,
  profileDiscoveryStatus: "idle",
};

function resolveNextActiveTerminalId(
  sessions: TerminalMeta[],
  preferredTerminalId: string | null,
) {
  if (preferredTerminalId && sessions.some((session) => session.id === preferredTerminalId)) {
    return preferredTerminalId;
  }

  return sessions[0]?.id ?? null;
}

function resolveNextActiveAfterClose(state: TerminalState, terminalId: string) {
  const closedIndex = state.sessions.findIndex((session) => session.id === terminalId);
  const remainingSessions = state.sessions.filter((session) => session.id !== terminalId);

  if (remainingSessions.length === 0) {
    return null;
  }

  if (state.activeTerminalId !== terminalId) {
    return resolveNextActiveTerminalId(remainingSessions, state.activeTerminalId);
  }

  const preferredIndex =
    closedIndex === -1 || closedIndex >= remainingSessions.length
      ? remainingSessions.length - 1
      : closedIndex;

  return remainingSessions[preferredIndex]?.id ?? remainingSessions[0]?.id ?? null;
}

const terminalSlice = createSlice({
  name: "terminal",
  initialState,
  reducers: {
    terminalSessionsLoaded(
      state,
      action: PayloadAction<{
        terminals: TerminalMeta[];
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
        terminal: TerminalMeta;
      }>,
    ) {
      const nextTerminal = action.payload.terminal;
      const existingIndex = state.sessions.findIndex((session) => session.id === nextTerminal.id);

      if (existingIndex === -1) {
        state.sessions.push(nextTerminal);
      } else {
        state.sessions[existingIndex] = nextTerminal;
      }

      state.activeTerminalId = nextTerminal.id;
      state.isReady = true;
    },
    terminalSessionActivated(state, action: PayloadAction<{ terminalId: string }>) {
      if (!state.sessions.some((session) => session.id === action.payload.terminalId)) {
        return;
      }

      state.activeTerminalId = action.payload.terminalId;
      state.isReady = true;
    },
    terminalSessionClosed(state, action: PayloadAction<{ terminalId: string }>) {
      const nextActiveTerminalId = resolveNextActiveAfterClose(state, action.payload.terminalId);
      state.sessions = state.sessions.filter((session) => session.id !== action.payload.terminalId);
      state.activeTerminalId = nextActiveTerminalId;
      state.isReady = Boolean(state.activeTerminalId);
    },
    terminalProfilesLoaded(state, action: PayloadAction<TerminalProfilesState>) {
      state.profiles = action.payload.profiles;
      state.defaultProfileId = action.payload.defaultProfileId;
      state.profileDiscoveryStatus = action.payload.discoveryStatus;
    },
  },
});

export const {
  terminalSessionsLoaded,
  terminalSessionReady,
  terminalSessionActivated,
  terminalSessionClosed,
  terminalProfilesLoaded,
} = terminalSlice.actions;

export default terminalSlice.reducer;
