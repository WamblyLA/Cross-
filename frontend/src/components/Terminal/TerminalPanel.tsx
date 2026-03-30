import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  VscAdd,
  VscChevronDown,
  VscChromeClose,
  VscClearAll,
  VscClose,
  VscDebugPause,
} from "react-icons/vsc";
import { hideBottomPanel } from "../../features/panel/panelSlice";
import { useTerminalConsoleChunks } from "../../features/terminal/terminalConsoleStore";
import { useDesktopActions } from "../../hooks/useDesktopActions";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { ThemeName } from "../../styles/tokens";
import FloatingMenu, { type MenuSection } from "../../ui/FloatingMenu";
import { getConsoleTheme } from "../BottomPanel/consoleTheme";
import { TERMINAL_UI_STRINGS } from "./terminalUiStrings";

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
  const [profileMenuAnchorRect, setProfileMenuAnchorRect] =
    useState<DOMRect | null>(null);

  const {
    activateTerminal,
    clearTerminal,
    closeTerminal,
    createTerminal,
    ensureTerminalSession,
    interruptTerminal,
    setDefaultTerminalProfile,
  } = useDesktopActions();
  const activeTerminalId = useAppSelector((state) => state.terminal.activeTerminalId);
  const terminalSessions = useAppSelector((state) => state.terminal.sessions);
  const terminalProfiles = useAppSelector((state) => state.terminal.profiles);
  const defaultProfileId = useAppSelector((state) => state.terminal.defaultProfileId);
  const profileDiscoveryStatus = useAppSelector(
    (state) => state.terminal.profileDiscoveryStatus,
  );
  const activeTerminal =
    terminalSessions.find((session) => session.id === activeTerminalId) ?? null;
  const isActive = useAppSelector(
    (state) => state.panel.isVisible && state.panel.activeTab === "terminal",
  );
  const terminalChunks = useTerminalConsoleChunks(activeTerminalId);

  const terminalTheme = useMemo(() => getConsoleTheme(theme), [theme]);

  const profileMenuSections = useMemo<MenuSection[]>(
    () => [
      {
        id: "terminal-create-profile",
        title:
          profileDiscoveryStatus === "loading"
            ? TERMINAL_UI_STRINGS.profilesLoading
            : TERMINAL_UI_STRINGS.createTerminalSection,
        items:
          terminalProfiles.length > 0
            ? terminalProfiles.map((profile) => ({
                id: `terminal-create-${profile.id}`,
                label: profile.label,
                disabled: !profile.isAvailable,
                onSelect: async () => {
                  await createTerminal(profile.id);
                },
              }))
            : [
                {
                  id: "terminal-profiles-empty",
                  label: TERMINAL_UI_STRINGS.emptyProfiles,
                  disabled: true,
                  onSelect: () => undefined,
                },
              ],
      },
      {
        id: "terminal-default-profile",
        title: TERMINAL_UI_STRINGS.defaultProfileSection,
        items:
          terminalProfiles.length > 0
            ? terminalProfiles.map((profile) => ({
                id: `terminal-default-${profile.id}`,
                label: `${profile.id === defaultProfileId ? `${TERMINAL_UI_STRINGS.selectedMark} ` : ""}${profile.label}`,
                disabled: !profile.isAvailable,
                onSelect: async () => {
                  await setDefaultTerminalProfile(profile.id);
                },
              }))
            : [],
      },
    ],
    [
      createTerminal,
      defaultProfileId,
      profileDiscoveryStatus,
      setDefaultTerminalProfile,
      terminalProfiles,
    ],
  );

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
        void window.electronAPI.resizeTerminal(
          terminal.cols,
          terminal.rows,
          currentTerminalId,
        );
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
    if (!isActive || !activeTerminalId) {
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
      <div className="border-b border-default px-3 pb-2 pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="ui-eyebrow">
              {TERMINAL_UI_STRINGS.title}
            </div>
            <div className="truncate text-xs text-secondary">
              {activeTerminal?.title ?? TERMINAL_UI_STRINGS.emptySubtitle}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {activeTerminal?.shellLabel ? (
              <span className="ui-pill ui-pill-muted">
                {activeTerminal.shellLabel}
              </span>
            ) : null}

            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={() => {
                void createTerminal();
              }}
              title={TERMINAL_UI_STRINGS.newTerminal}
            >
              <VscAdd />
            </button>

            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={(event) => {
                setProfileMenuAnchorRect(event.currentTarget.getBoundingClientRect());
              }}
              title={TERMINAL_UI_STRINGS.terminalProfiles}
            >
              <VscChevronDown />
            </button>

            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={() => {
                void interruptTerminal(activeTerminalId);
              }}
              title={TERMINAL_UI_STRINGS.interruptTerminal}
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
              title={TERMINAL_UI_STRINGS.clearTerminal}
              disabled={!activeTerminalId}
            >
              <VscClearAll />
            </button>

            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={() => dispatch(hideBottomPanel())}
              title={TERMINAL_UI_STRINGS.hideBottomPanel}
            >
              <VscChromeClose />
            </button>
          </div>
        </div>

        <div className="ui-scrollbar-x mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {terminalSessions.map((session) => {
            const isCurrent = session.id === activeTerminalId;

            return (
              <div
                key={session.id}
                className={`group flex shrink-0 items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition-colors ${
                  isCurrent
                    ? "border-default bg-active text-primary"
                    : "border-transparent bg-editor text-secondary hover:border-default hover:text-primary"
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={(event) => {
                    event.preventDefault();
                    void activateTerminal(session.id);
                  }}
                  title={session.title}
                >
                  <span className="max-w-[180px] truncate">{session.title}</span>
                  <span className="text-xs text-muted">{session.shellLabel}</span>
                </button>

                <button
                  type="button"
                  className="rounded p-0.5 text-muted transition-colors hover:bg-hover hover:text-primary"
                  onClick={() => {
                    void closeTerminal(session.id);
                  }}
                  title={TERMINAL_UI_STRINGS.closeTerminal}
                >
                  <VscClose />
                </button>
              </div>
            );
          })}

          {terminalSessions.length === 0 ? (
            <div className="ui-console-frame border-dashed px-3 py-2 text-sm text-muted">
              {profileDiscoveryStatus === "loading"
                ? TERMINAL_UI_STRINGS.profilesLoading
                : TERMINAL_UI_STRINGS.noSessions}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-2 py-2">
        <div
          ref={terminalHostRef}
          className="ui-console-frame h-full w-full overflow-hidden px-2 py-2"
        />
      </div>

      {profileMenuAnchorRect ? (
        <FloatingMenu
          sections={profileMenuSections}
          position={{ type: "anchor", rect: profileMenuAnchorRect, align: "right" }}
          onClose={() => setProfileMenuAnchorRect(null)}
          width={240}
        />
      ) : null}
    </div>
  );
}
