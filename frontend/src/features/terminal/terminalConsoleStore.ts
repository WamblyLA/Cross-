import { useSyncExternalStore } from "react";

const MAX_CHUNKS_PER_TERMINAL = 4000;
const EMPTY_CHUNKS: readonly string[] = Object.freeze([]);

type Listener = () => void;

const chunksByTerminalId = new Map<string, string[]>();
const listenersByTerminalId = new Map<string, Set<Listener>>();

function notify(terminalId: string) {
  const listeners = listenersByTerminalId.get(terminalId);

  if (!listeners) {
    return;
  }

  listeners.forEach((listener) => {
    listener();
  });
}

export function appendTerminalConsoleChunk(event: { terminalId: string; text: string }) {
  if (!event.text) {
    return;
  }

  const currentChunks = chunksByTerminalId.get(event.terminalId) ?? [];
  const nextChunks = [...currentChunks, event.text];

  chunksByTerminalId.set(
    event.terminalId,
    nextChunks.length > MAX_CHUNKS_PER_TERMINAL
      ? nextChunks.slice(nextChunks.length - MAX_CHUNKS_PER_TERMINAL)
      : nextChunks,
  );

  notify(event.terminalId);
}

export function clearTerminalConsoleSession(terminalId: string) {
  if (!chunksByTerminalId.has(terminalId)) {
    return;
  }

  chunksByTerminalId.delete(terminalId);
  notify(terminalId);
}

function getTerminalConsoleChunks(terminalId: string | null) {
  if (!terminalId) {
    return EMPTY_CHUNKS;
  }

  return chunksByTerminalId.get(terminalId) ?? EMPTY_CHUNKS;
}

function subscribe(terminalId: string | null, listener: Listener) {
  if (!terminalId) {
    return () => undefined;
  }

  const listeners = listenersByTerminalId.get(terminalId) ?? new Set<Listener>();
  listeners.add(listener);
  listenersByTerminalId.set(terminalId, listeners);

  return () => {
    const currentListeners = listenersByTerminalId.get(terminalId);

    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);

    if (currentListeners.size === 0) {
      listenersByTerminalId.delete(terminalId);
    }
  };
}

export function useTerminalConsoleChunks(terminalId: string | null) {
  return useSyncExternalStore(
    (listener) => subscribe(terminalId, listener),
    () => getTerminalConsoleChunks(terminalId),
    () => EMPTY_CHUNKS,
  );
}
