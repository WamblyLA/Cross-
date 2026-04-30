import { useSyncExternalStore } from "react";
import type { RunDataEvent, RunOutputChunk } from "./runTypes";

const MAX_CHUNKS_PER_SESSION = 4000;
const EMPTY_CHUNKS: readonly RunOutputChunk[] = Object.freeze([]);

type Listener = () => void;

const outputBySessionId = new Map<string, RunOutputChunk[]>();
const listenersBySessionId = new Map<string, Set<Listener>>();

function createChunk(event: RunDataEvent): RunOutputChunk {
  return {
    id: `${event.sessionId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    sessionId: event.sessionId,
    text: event.text,
    stream: event.stream,
    stage: event.stage,
  };
}

function notify(sessionId: string) {
  const listeners = listenersBySessionId.get(sessionId);

  if (!listeners) {
    return;
  }

  listeners.forEach((listener) => {
    listener();
  });
}

export function appendRunConsoleChunk(event: RunDataEvent) {
  const currentChunks = outputBySessionId.get(event.sessionId) ?? [];
  const nextChunks = [...currentChunks, createChunk(event)];

  outputBySessionId.set(
    event.sessionId,
    nextChunks.length > MAX_CHUNKS_PER_SESSION
      ? nextChunks.slice(nextChunks.length - MAX_CHUNKS_PER_SESSION)
      : nextChunks,
  );

  notify(event.sessionId);
}

export function getRunConsoleChunks(sessionId: string | null) {
  if (!sessionId) {
    return EMPTY_CHUNKS;
  }

  return outputBySessionId.get(sessionId) ?? EMPTY_CHUNKS;
}

function subscribe(sessionId: string | null, listener: Listener) {
  if (!sessionId) {
    return () => undefined;
  }

  const listeners = listenersBySessionId.get(sessionId) ?? new Set<Listener>();
  listeners.add(listener);
  listenersBySessionId.set(sessionId, listeners);

  return () => {
    const currentListeners = listenersBySessionId.get(sessionId);

    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);

    if (currentListeners.size === 0) {
      listenersBySessionId.delete(sessionId);
    }
  };
}

export function useRunConsoleChunks(sessionId: string | null) {
  return useSyncExternalStore(
    (listener) => subscribe(sessionId, listener),
    () => getRunConsoleChunks(sessionId),
    () => EMPTY_CHUNKS,
  );
}
