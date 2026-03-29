import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useMemo, useRef } from "react";
import { VscClearAll, VscChromeClose } from "react-icons/vsc";
import { hideBottomPanel } from "../../features/panel/panelSlice";
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
  const terminalIdRef = useRef<string | null>(null);

  const { ensureTerminalSession, clearTerminal } = useDesktopActions();
  const terminalId = useAppSelector((state) => state.terminal.terminalId);
  const terminalTitle = useAppSelector((state) => state.terminal.title);
  const shellLabel = useAppSelector((state) => state.terminal.shellLabel);
  const isActive = useAppSelector(
    (state) => state.panel.isVisible && state.panel.activeTab === "terminal",
  );

  const terminalTheme = useMemo(() => getConsoleTheme(theme), [theme]);

  useEffect(() => {
    terminalIdRef.current = terminalId;
  }, [terminalId]);

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
      const currentTerminalId = terminalIdRef.current;

      if (!currentTerminalId) {
        return;
      }

      void window.electronAPI.writeToTerminal(data, currentTerminalId);
    });

    const unsubscribeData = window.electronAPI.onTerminalData((payload) => {
      if (!terminalIdRef.current || payload.terminalId !== terminalIdRef.current) {
        return;
      }

      terminal.write(payload.text);
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const observer = new ResizeObserver(() => {
      const currentTerminalId = terminalIdRef.current;
      fitAddon.fit();

      if (currentTerminalId) {
        void window.electronAPI.resizeTerminal(terminal.cols, terminal.rows, currentTerminalId);
      }
    });

    observer.observe(terminalHostRef.current);

    return () => {
      observer.disconnect();
      unsubscribeData();
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
    if (!isActive) {
      return;
    }

    void ensureTerminalSession().then((session) => {
      terminalIdRef.current = session.terminal.id;

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
  }, [ensureTerminalSession, isActive]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 items-center justify-between gap-3 border-b border-default px-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Терминал</div>
          <div className="truncate text-xs text-secondary">
            {terminalTitle ?? "Локальная shell-сессия внутри IDE"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {shellLabel ? (
            <span className="rounded-full border border-default px-2 py-1 text-[11px] text-muted">
              {shellLabel}
            </span>
          ) : null}

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => {
              terminalRef.current?.clear();
              void clearTerminal();
            }}
            title="Очистить терминал"
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