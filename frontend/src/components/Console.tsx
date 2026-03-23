import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useMemo, useRef } from "react";
import { VscClearAll, VscChromeClose } from "react-icons/vsc";
import { setTerminalVisible } from "../features/runner/runnerSlice";
import { useDesktopActions } from "../hooks/useDesktopActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { ThemeName } from "../styles/tokens";

type ConsoleProps = {
  theme: ThemeName;
};

function getTerminalTheme(theme: ThemeName) {
  if (theme === "light") {
    return {
      background: "#f2f7f3",
      foreground: "#142017",
      cursor: "#3f784e",
      selectionBackground: "#cfe2d4",
      black: "#142017",
      red: "#c45555",
      green: "#3d8753",
      yellow: "#b97b2a",
      blue: "#4e8e61",
      magenta: "#607365",
      cyan: "#3d8753",
      white: "#f8fbf8",
      brightBlack: "#607365",
      brightRed: "#c45555",
      brightGreen: "#3d8753",
      brightYellow: "#b97b2a",
      brightBlue: "#4e8e61",
      brightMagenta: "#607365",
      brightCyan: "#3d8753",
      brightWhite: "#ffffff",
    };
  }

  return {
    background: "#0d1410",
    foreground: "#edf5ee",
    cursor: "#67af7b",
    selectionBackground: "#2e5a3a",
    black: "#0a0f0b",
    red: "#d97979",
    green: "#6fbe7f",
    yellow: "#d2a15b",
    blue: "#67af7b",
    magenta: "#8ea28f",
    cyan: "#67af7b",
    white: "#edf5ee",
    brightBlack: "#8ea28f",
    brightRed: "#d97979",
    brightGreen: "#6fbe7f",
    brightYellow: "#d2a15b",
    brightBlue: "#67af7b",
    brightMagenta: "#c5d5c7",
    brightCyan: "#67af7b",
    brightWhite: "#f6fbf7",
  };
}

export default function Console({ theme }: ConsoleProps) {
  const dispatch = useAppDispatch();
  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { clearTerminal } = useDesktopActions();
  const { isVisible, isReady, isRunning, shellLabel, activeInterpreter, activeRunFilePath, lastExitCode } =
    useAppSelector((state) => state.runner);

  const terminalTheme = useMemo(() => getTerminalTheme(theme), [theme]);

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
      void window.electronAPI.writeToTerminal(data);
    });

    const unsubscribeData = window.electronAPI.onTerminalData((payload) => {
      terminal.write(payload.text);
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      void window.electronAPI.resizeTerminal(terminal.cols, terminal.rows);
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
    if (!isVisible || !fitAddonRef.current || !terminalRef.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      fitAddonRef.current?.fit();
      if (terminalRef.current) {
        void window.electronAPI.resizeTerminal(terminalRef.current.cols, terminalRef.current.rows);
        terminalRef.current.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isReady, isVisible]);

  return (
    <div
      className={`shrink-0 overflow-hidden bg-chrome transition-[height,opacity,border-color] duration-200 ${
        isVisible ? "h-64 border-t border-default opacity-100" : "h-0 border-t-0 opacity-0"
      }`}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-11 items-center justify-between gap-3 border-b border-default px-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Terminal</div>
            <div className="truncate text-xs text-secondary">
              {activeRunFilePath
                ? `${isRunning ? "Выполняется" : "Последний запуск"}: ${activeRunFilePath}`
                : "Локальная shell-сессия внутри IDE"}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {shellLabel ? (
              <span className="rounded-full border border-default px-2 py-1 text-[11px] text-muted">
                {shellLabel}
              </span>
            ) : null}

            {activeInterpreter ? (
              <span className="rounded-full border border-default px-2 py-1 text-[11px] text-muted">
                {activeInterpreter}
              </span>
            ) : null}

            {lastExitCode !== null ? (
              <span className="rounded-full border border-default px-2 py-1 text-[11px] text-secondary">
                Код: {lastExitCode}
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
              onClick={() => dispatch(setTerminalVisible(false))}
              title="Скрыть терминал"
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
    </div>
  );
}
