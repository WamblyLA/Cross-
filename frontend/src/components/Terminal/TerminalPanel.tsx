import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useMemo, useRef } from "react";
import { VscClearAll, VscChromeClose, VscDebugPause } from "react-icons/vsc";
import { hideBottomPanel } from "../../features/panel/panelSlice";
import { useTerminalConsoleChunks } from "../../features/terminal/terminalConsoleStore";
import { useDesktopActions } from "../../hooks/useDesktopActions";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { ThemeName } from "../../styles/tokens";
import { getConsoleTheme } from "../BottomPanel/consoleTheme";

type TerminalPanelProps = {
  theme: ThemeName;
};

export default function TerminalPanel({ theme }: TerminalPanelProps) {
  const dispatch = useAppDispatch();
  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const activeTerminalIdRef = useRef<string | null>(null);
  const renderedChunkCountRef = useRef(0);

  const { clearTerminal, ensureTerminalSession, interruptTerminal } = useDesktopActions();
  const activeTerminalId = useAppSelector((state) => state.terminal.activeTerminalId);
  const terminalSessions = useAppSelector((state) => state.terminal.sessions);
  const activeTerminal = terminalSessions.find((session) => session.id === activeTerminalId) ?? null;
  const isActive = useAppSelector(
    (state) => state.panel.isVisible && state.panel.activeTab === "terminal",
  );
  const terminalChunks = useTerminalConsoleChunks(activeTerminalId);

  const terminalTheme = useMemo(() => getConsoleTheme(theme), [theme]);

  useEffect(() => {
    activeTerminalIdRef.current = activeTerminalId;
  }, [activeTerminalId]);

  useEffect(() => {
    if (!terminalHostRef.current || terminalRef.current) {
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
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(terminalHostRef.current);

    const disposeInput = terminal.onData((data) => {
      const currentTerminalId = activeTerminalIdRef.current;

      if (!currentTerminalId) {
        return;
      }

      void window.electronAPI.writeToTerminal(data, currentTerminalId);
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const observer = new ResizeObserver(() => {
      const currentTerminalId = activeTerminalIdRef.current;
      fitAddon.fit();

      if (currentTerminalId) {
        void window.electronAPI.resizeTerminal(terminal.cols, terminal.rows, currentTerminalId);
      }
    });

    observer.observe(terminalHostRef.current);

    return () => {
      observer.disconnect();
      disposeInput.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalTheme]);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    terminalRef.current.options.theme = terminalTheme;
    terminalRef.current.refresh(0, terminalRef.current.rows - 1);
  }, [terminalTheme]);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    terminalRef.current.write("\x1bc");
    renderedChunkCountRef.current = 0;
  }, [activeTerminalId]);

  useEffect(() => {
    const terminal = terminalRef.current;

    if (!terminal) {
      return;
    }

    const nextChunks = terminalChunks.slice(renderedChunkCountRef.current);

    if (nextChunks.length === 0) {
      return;
    }

    terminal.write(nextChunks.join(""));
    renderedChunkCountRef.current = terminalChunks.length;
  }, [terminalChunks]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    void ensureTerminalSession(activeTerminalId).then((session) => {
      activeTerminalIdRef.current = session.terminal.id;

      window.requestAnimationFrame(() => {
        fitAddonRef.current?.fit();

        if (!terminalRef.current) {
          return;
        }

        void window.electronAPI.resizeTerminal(
          terminalRef.current.cols,
          terminalRef.current.rows,
          session.terminal.id,
        );
        terminalRef.current.focus();
      });
    });
  }, [activeTerminalId, ensureTerminalSession, isActive]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 items-center justify-between gap-3 border-b border-default px-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Терминал</div>
          <div className="truncate text-xs text-secondary">
            {activeTerminal?.title ?? "Локальная shell-сессия внутри IDE"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {activeTerminal?.shellLabel ? (
            <span className="rounded-full border border-default px-2 py-1 text-[11px] text-muted">
              {activeTerminal.shellLabel}
            </span>
          ) : null}

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => {
              void interruptTerminal(activeTerminalId);
            }}
            title="Прервать терминал"
            disabled={!activeTerminalId}
          >
            <VscDebugPause />
          </button>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => {
              terminalRef.current?.clear();
              renderedChunkCountRef.current = 0;
              void clearTerminal(activeTerminalId);
            }}
            title="Очистить терминал"
            disabled={!activeTerminalId}
          >
            <VscClearAll />
          </button>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => dispatch(hideBottomPanel())}
            title="Скрыть нижнюю панель"
          >
            <VscChromeClose />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-2 py-2">
        <div
          ref={terminalHostRef}
          className="h-full w-full overflow-hidden rounded-[10px] border border-default bg-editor px-2 py-2"
        />
      </div>
    </div>
  );
}
