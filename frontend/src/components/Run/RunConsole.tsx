import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useMemo, useRef } from "react";
import { useRunConsoleChunks } from "../../features/run/runConsoleStore";
import type { RunOutputChunk, RunSession } from "../../features/run/runTypes";
import type { ThemeName } from "../../styles/tokens";
import { getConsoleTheme } from "../BottomPanel/consoleTheme";

type RunConsoleProps = {
  theme: ThemeName;
  session: RunSession | null;
  isActive: boolean;
  onStop: () => void;
};

function formatChunk(chunk: RunOutputChunk) {
  if (chunk.stream === "system") {
    return `\u001b[38;5;108m${chunk.text}\u001b[0m`;
  }

  if (chunk.stream === "stderr") {
    return `\u001b[31m${chunk.text}\u001b[0m`;
  }

  return chunk.text;
}

function isPrintableCharacter(character: string) {
  return character >= " " && character !== "\u007f";
}

export default function RunConsole({ theme, session, isActive, onStop }: RunConsoleProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isReadyRef = useRef(false);
  const isDisposedRef = useRef(false);
  const renderedStateRef = useRef<{ sessionId: string | null; chunkCount: number }>({
    sessionId: null,
    chunkCount: 0,
  });
  const sessionRef = useRef<RunSession | null>(session);
  const outputRef = useRef<readonly RunOutputChunk[]>([]);
  const inputBufferRef = useRef("");
  const output = useRunConsoleChunks(session?.id ?? null);

  const terminalTheme = useMemo(() => getConsoleTheme(theme), [theme]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    outputRef.current = output;
  }, [output]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host || terminalRef.current) {
      return;
    }

    isDisposedRef.current = false;
    isReadyRef.current = false;

    const terminal = new Terminal({
      cols: 120,
      rows: 30,
      cursorBlink: true,
      fontFamily: "Consolas, 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.35,
      scrollback: 5000,
      allowProposedApi: false,
      theme: terminalTheme,
      convertEol: false,
    });

    terminal.open(host);
    terminalRef.current = terminal;

    const disposeInput = terminal.onData((data) => {
      const currentSession = sessionRef.current;

      if (data === "\u0003") {
        onStop();
        return;
      }

      if (!currentSession?.supportsInput || !currentSession.isBusy) {
        return;
      }

      if (data.startsWith("\u001b")) {
        return;
      }

      for (const character of data) {
        if (character === "\u0003") {
          onStop();
          return;
        }

        if (character === "\r") {
          const payload = `${inputBufferRef.current}\n`;
          inputBufferRef.current = "";
          terminal.write("\r\n");
          void window.electronAPI.writeToRunSession(currentSession.id, payload);
          continue;
        }

        if (character === "\u007f" || character === "\b") {
          if (!inputBufferRef.current) {
            continue;
          }

          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          terminal.write("\b \b");
          continue;
        }

        if (!isPrintableCharacter(character) && character !== "\t") {
          continue;
        }

        inputBufferRef.current += character;
        terminal.write(character);
      }
    });

    const flushOutput = () => {
      if (!terminalRef.current || isDisposedRef.current || !isReadyRef.current) {
        return;
      }

      const currentSessionId = sessionRef.current?.id ?? null;

      if (renderedStateRef.current.sessionId !== currentSessionId) {
        terminalRef.current.reset();
        inputBufferRef.current = "";
        renderedStateRef.current = {
          sessionId: currentSessionId,
          chunkCount: 0,
        };
      }

      const nextChunks = outputRef.current.slice(renderedStateRef.current.chunkCount);

      for (const chunk of nextChunks) {
        terminalRef.current.write(formatChunk(chunk));
      }

      if (nextChunks.length > 0) {
        terminalRef.current.scrollToBottom();
      }

      renderedStateRef.current.chunkCount = outputRef.current.length;
    };

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;

      if (isDisposedRef.current || !terminalRef.current) {
        return;
      }

      isReadyRef.current = true;
      flushOutput();

      if (isActive) {
        terminalRef.current.focus();
      }
    });

    flushOutput();

    return () => {
      isDisposedRef.current = true;
      isReadyRef.current = false;

      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      disposeInput.dispose();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [isActive, onStop, terminalTheme]);

  useEffect(() => {
    if (!terminalRef.current || isDisposedRef.current) {
      return;
    }

    terminalRef.current.options.theme = terminalTheme;
  }, [terminalTheme]);

  useEffect(() => {
    if (!terminalRef.current || isDisposedRef.current || !isReadyRef.current) {
      return;
    }

    const currentSessionId = sessionRef.current?.id ?? null;

    if (renderedStateRef.current.sessionId !== currentSessionId) {
      terminalRef.current.reset();
      inputBufferRef.current = "";
      renderedStateRef.current = {
        sessionId: currentSessionId,
        chunkCount: 0,
      };
    }

    const nextChunks = output.slice(renderedStateRef.current.chunkCount);

    for (const chunk of nextChunks) {
      terminalRef.current.write(formatChunk(chunk));
    }

    if (nextChunks.length > 0) {
      terminalRef.current.scrollToBottom();
    }

    renderedStateRef.current.chunkCount = output.length;
  }, [output, session?.id]);

  useEffect(() => {
    if (!isActive || !terminalRef.current || isDisposedRef.current || !isReadyRef.current) {
      return;
    }

    terminalRef.current.focus();
  }, [isActive, session?.id]);

  return (
    <div className="min-h-0 flex-1 px-2 py-2">
      <div
        ref={hostRef}
        className="ui-console-frame h-full w-full overflow-hidden px-2 py-2"
      />
    </div>
  );
}
