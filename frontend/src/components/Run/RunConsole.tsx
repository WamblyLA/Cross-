import { FitAddon } from "@xterm/addon-fit";
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
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isDisposedRef = useRef(false);
  const renderedStateRef = useRef<{ sessionId: string | null; chunkCount: number }>({
    sessionId: null,
    chunkCount: 0,
  });
  const sessionRef = useRef<RunSession | null>(session);
  const inputBufferRef = useRef("");
  const output = useRunConsoleChunks(session?.id ?? null);

  const terminalTheme = useMemo(() => getConsoleTheme(theme), [theme]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    isDisposedRef.current = false;

    return () => {
      isDisposedRef.current = true;
    };
  }, []);

  const fitTerminal = () => {
    if (isDisposedRef.current || !hostRef.current || !terminalRef.current || !fitAddonRef.current) {
      return;
    }

    try {
      fitAddonRef.current.fit();
    } catch {
      // DONE.
    }
  };

  useEffect(() => {
    if (!hostRef.current || terminalRef.current) {
      return;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "Consolas, 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.35,
      scrollback: 5000,
      allowProposedApi: false,
      theme: terminalTheme,
      convertEol: false,
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(hostRef.current);

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

    const observer = new ResizeObserver(() => {
      const currentSession = sessionRef.current;
      fitTerminal();

      if (currentSession && terminalRef.current) {
        void window.electronAPI.resizeRunSession(currentSession.id, terminal.cols, terminal.rows);
      }
    });

    observer.observe(hostRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    return () => {
      observer.disconnect();
      disposeInput.dispose();
      isDisposedRef.current = true;
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [onStop, terminalTheme]);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    terminalRef.current.options.theme = terminalTheme;
    terminalRef.current.refresh(0, terminalRef.current.rows - 1);
  }, [terminalTheme]);

  useEffect(() => {
    const terminal = terminalRef.current;

    if (!terminal) {
      return;
    }

    const renderedState = renderedStateRef.current;
    const sessionId = session?.id ?? null;

    if (renderedState.sessionId !== sessionId) {
      terminal.reset();
      inputBufferRef.current = "";
      renderedStateRef.current = {
        sessionId,
        chunkCount: 0,
      };
    }

    const nextChunks = output.slice(renderedStateRef.current.chunkCount);

    nextChunks.forEach((chunk) => {
      terminal.write(formatChunk(chunk));
    });

    renderedStateRef.current.chunkCount = output.length;
  }, [output, session?.id]);

  useEffect(() => {
    if (!isActive || !terminalRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (isDisposedRef.current) {
        return;
      }

      fitTerminal();

      if (!terminalRef.current || !session) {
        return;
      }

      void window.electronAPI.resizeRunSession(
        session.id,
        terminalRef.current.cols,
        terminalRef.current.rows,
      );
      terminalRef.current.focus();
    });
  }, [isActive, session]);

  return (
    <div className="min-h-0 flex-1 px-2 py-2">
      <div
        ref={hostRef}
        className="h-full w-full overflow-hidden rounded-[10px] border border-default bg-editor px-2 py-2"
      />
    </div>
  );
}
