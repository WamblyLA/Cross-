import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { IoIosSquareOutline } from "react-icons/io";
import { IoSearchOutline } from "react-icons/io5";
import { RxCross1 } from "react-icons/rx";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import { VscChevronDown, VscChromeClose, VscEllipsis } from "react-icons/vsc";
import { selectIsAuthenticated } from "../../features/auth/authSelectors";
import {
  selectCloudActiveProjectId,
  selectCloudSelectedItemCount,
  selectCloudSelectedItemType,
} from "../../features/cloud/cloudSelectors";
import { requestExplorerAction, setWorkspaceSource } from "../../features/workspace/workspaceSlice";
import { useDesktopActions } from "../../hooks/useDesktopActions";
import { useRunActions } from "../../hooks/useRunActions";
import { useWorkspaceActions } from "../../hooks/useWorkspaceActions";
import type { ThemeName } from "../../styles/tokens";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import SearchBar from "../../ui/SearchBar";
import TopBarAccountControls from "./TopBarAccountControls";
import TopBarIcon from "./TopBarIcon";
import TopBarRunButton from "./TopBarRunButton";

type TopBarProps = {
  theme: ThemeName;
  onToggleTheme: () => void;
};

type MenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => unknown | Promise<unknown>;
};

type MenuSection = {
  id: string;
  title?: string;
  items: MenuItem[];
};

type MenuConfig = {
  id: string;
  label: string;
  sections: MenuSection[];
};

type OverflowSubmenuState = {
  menuId: string;
  anchorRect: DOMRect;
};

const MENU_PANEL_WIDTH = 248;
const OVERFLOW_PANEL_WIDTH = 188;
const VIEWPORT_GAP = 8;
const OVERLAY_OFFSET = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function estimatePanelHeight(sections: MenuSection[]) {
  return sections.reduce((height, section, index) => {
    const sectionGap = index > 0 ? 10 : 0;
    const titleHeight = section.title ? 22 : 0;
    const itemsHeight = section.items.length * 36;
    return height + sectionGap + titleHeight + itemsHeight + 12;
  }, 8);
}

function getAnchoredPanelStyle(
  anchorRect: DOMRect,
  width: number,
  height: number,
  align: "left" | "right" = "left",
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = Math.max(VIEWPORT_GAP, viewportWidth - width - VIEWPORT_GAP);
  const preferredLeft = align === "right" ? anchorRect.right - width : anchorRect.left;
  const left = clamp(preferredLeft, VIEWPORT_GAP, maxLeft);
  const belowTop = anchorRect.bottom + OVERLAY_OFFSET;
  const maxTop = Math.max(VIEWPORT_GAP, viewportHeight - height - VIEWPORT_GAP);
  const top =
    belowTop + height <= viewportHeight - VIEWPORT_GAP
      ? belowTop
      : clamp(anchorRect.top - height - OVERLAY_OFFSET, VIEWPORT_GAP, maxTop);

  return {
    left,
    top,
    width,
  };
}

function getSubmenuPanelStyle(anchorRect: DOMRect, width: number, height: number) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const canOpenRight = anchorRect.right + OVERLAY_OFFSET + width <= viewportWidth - VIEWPORT_GAP;
  const preferredLeft = canOpenRight
    ? anchorRect.right + OVERLAY_OFFSET
    : anchorRect.left - width - OVERLAY_OFFSET;
  const maxLeft = Math.max(VIEWPORT_GAP, viewportWidth - width - VIEWPORT_GAP);
  const left = clamp(preferredLeft, VIEWPORT_GAP, maxLeft);
  const maxTop = Math.max(VIEWPORT_GAP, viewportHeight - height - VIEWPORT_GAP);
  const top = clamp(anchorRect.top - 6, VIEWPORT_GAP, maxTop);

  return {
    left,
    top,
    width,
  };
}

function MenuPanel({
  sections,
  style,
  onSelect,
}: {
  sections: MenuSection[];
  style: { left: number; top: number; width: number };
  onSelect: (item: MenuItem) => void;
}) {
  return (
    <div
      className="pointer-events-auto fixed z-[120] rounded-[14px] border border-default bg-panel p-1 shadow-2xl"
      style={style}
      role="menu"
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.id}
          className={sectionIndex > 0 ? "mt-1 border-t border-default pt-1" : ""}
        >
          {section.title ? (
            <div className="px-3 pb-1 pt-1 text-[11px] uppercase tracking-[0.18em] text-muted">
              {section.title}
            </div>
          ) : null}

          {section.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-sm transition-colors ${
                item.disabled
                  ? "cursor-not-allowed text-muted"
                  : "text-secondary hover:bg-hover hover:text-primary"
              }`}
              disabled={item.disabled}
              onClick={() => onSelect(item)}
              role="menuitem"
            >
              <span>{item.label}</span>
              {item.shortcut ? (
                <span className="text-[11px] text-muted">{item.shortcut}</span>
              ) : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function OverflowPanel({
  hiddenMenus,
  mainStyle,
  submenuState,
  onOpenSubmenu,
  onSelect,
}: {
  hiddenMenus: MenuConfig[];
  mainStyle: { left: number; top: number; width: number };
  submenuState: OverflowSubmenuState | null;
  onOpenSubmenu: (menuId: string, anchorRect: DOMRect) => void;
  onSelect: (item: MenuItem) => void;
}) {
  const submenuConfig = hiddenMenus.find((menu) => menu.id === submenuState?.menuId) ?? null;
  const submenuStyle =
    submenuConfig && submenuState
      ? getSubmenuPanelStyle(
          submenuState.anchorRect,
          MENU_PANEL_WIDTH,
          estimatePanelHeight(submenuConfig.sections),
        )
      : null;

  return (
    <>
      <div
        className="pointer-events-auto fixed z-[120] rounded-[14px] border border-default bg-panel p-1 shadow-2xl"
        style={mainStyle}
        role="menu"
      >
        {hiddenMenus.map((menu) => (
          <button
            key={menu.id}
            type="button"
            className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-sm transition-colors ${
              submenuState?.menuId === menu.id
                ? "bg-hover text-primary"
                : "text-secondary hover:bg-hover hover:text-primary"
            }`}
            onMouseEnter={(event) => {
              onOpenSubmenu(menu.id, event.currentTarget.getBoundingClientRect());
            }}
            onFocus={(event) => {
              onOpenSubmenu(menu.id, event.currentTarget.getBoundingClientRect());
            }}
            onClick={(event) => {
              onOpenSubmenu(menu.id, event.currentTarget.getBoundingClientRect());
            }}
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={submenuState?.menuId === menu.id}
          >
            <span>{menu.label}</span>
            <VscChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />
          </button>
        ))}
      </div>

      {submenuConfig && submenuStyle ? (
        <MenuPanel sections={submenuConfig.sections} style={submenuStyle} onSelect={onSelect} />
      ) : null}
    </>
  );
}

export default function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const menuViewportRef = useRef<HTMLDivElement | null>(null);
  const measureRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const overflowMeasureRef = useRef<HTMLButtonElement | null>(null);
  const overflowTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchOverlayRef = useRef<HTMLDivElement | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [visibleMenuIds, setVisibleMenuIds] = useState<string[]>([
    "file",
    "edit",
    "view",
    "terminal",
    "run",
    "settings",
  ]);
  const [overflowSubmenu, setOverflowSubmenu] = useState<OverflowSubmenuState | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const selectedPath = useAppSelector((state) => state.workspace.selectedPath);
  const selectionCount = useAppSelector((state) => state.workspace.selectionCount);
  const activeSearchQuery = useAppSelector((state) => state.workspace.searchQuery);
  const selectedCloudItemType = useAppSelector(selectCloudSelectedItemType);
  const selectedCloudItemCount = useAppSelector(selectCloudSelectedItemCount);
  const activeCloudProjectId = useAppSelector(selectCloudActiveProjectId);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isTerminalVisible = useAppSelector(
    (state) => state.panel.isVisible && state.panel.activeTab === "terminal",
  );
  const isTerminalReady = useAppSelector((state) => state.terminal.isReady);
  const activeTerminalId = useAppSelector((state) => state.terminal.activeTerminalId);
  const terminalSessions = useAppSelector((state) => state.terminal.sessions);
  const currentRunSession = useAppSelector((state) => state.run.currentSession);
  const isRunning = Boolean(
    currentRunSession &&
      ["preparing", "materializing", "building", "running"].includes(currentRunSession.status),
  );
  const {
    activateTerminal,
    clearTerminal,
    createTerminal,
    focusTerminal,
    interruptTerminal,
    openTerminal,
    toggleTerminal,
  } = useDesktopActions();
  const { activeFile, openFolder, saveActiveFile } = useWorkspaceActions();
  const { openRunConfigurationDialog, rerun, runSelectedConfiguration, stopRun } = useRunActions();

  const closeMenus = useCallback(() => {
    setOpenMenuId(null);
    setOverflowSubmenu(null);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    closeMenus();
    setIsSearchOpen(true);
  }, [closeMenus]);

  const canRenameSelectedNode =
    source === "cloud"
      ? selectedCloudItemCount === 1 &&
        (selectedCloudItemType === "project" ||
          selectedCloudItemType === "folder" ||
          selectedCloudItemType === "file")
      : selectionCount === 1 && Boolean(selectedPath && selectedPath !== rootPath);
  const canDeleteSelectedNode =
    source === "cloud"
      ? selectedCloudItemCount > 0 &&
        (selectedCloudItemType === "project" ||
          selectedCloudItemType === "folder" ||
          selectedCloudItemType === "file")
      : selectionCount > 0 && Boolean(selectedPath && selectedPath !== rootPath);
  const canCreateFile =
    source === "cloud" ? isAuthenticated && Boolean(activeCloudProjectId) : Boolean(rootPath);
  const canCreateFolder =
    source === "cloud" ? isAuthenticated && Boolean(activeCloudProjectId) : Boolean(rootPath);
  const canCreateProject = isAuthenticated;
  const canRefreshExplorer = source === "cloud" ? isAuthenticated : Boolean(rootPath);
  const canCollapseExplorer =
    source === "cloud" ? isAuthenticated && Boolean(activeCloudProjectId) : Boolean(rootPath);
  const hasTerminalSession = Boolean(activeTerminalId);
  const hasRunnableFile = ["py", "cpp", "cc", "cxx"].includes(
    activeFile?.extension?.toLowerCase() ?? "",
  );
  const hasRunnableProjectContext =
    source === "cloud" ? Boolean(activeCloudProjectId) : Boolean(rootPath);
  const canRunActiveTarget = Boolean(
    !isRunning && (hasRunnableProjectContext || (activeFile && hasRunnableFile)),
  );

  const handleOpenCloudProjectDraft = useCallback(() => {
    dispatch(setWorkspaceSource("cloud"));
    dispatch(requestExplorerAction("create-project"));
  }, [dispatch]);

  const settingsLabel =
    theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему";

  const primaryMenus = useMemo<MenuConfig[]>(
    () => [
      {
        id: "file",
        label: "Файл",
        sections: [
          {
            id: "file-main",
            items: [
              {
                id: "open-folder",
                label: "Открыть папку",
                shortcut: "Ctrl+O",
                onSelect: openFolder,
              },
              {
                id: "new-project",
                label: "Новый проект в облаке",
                disabled: !canCreateProject,
                onSelect: handleOpenCloudProjectDraft,
              },
              {
                id: "new-file",
                label: source === "cloud" ? "Новый облачный файл" : "Новый файл",
                shortcut: "Ctrl+N",
                disabled: !canCreateFile,
                onSelect: () => dispatch(requestExplorerAction("create-file")),
              },
              {
                id: "new-folder",
                label: "Новая папка",
                shortcut: "Ctrl+Shift+N",
                disabled: !canCreateFolder,
                onSelect: () => dispatch(requestExplorerAction("create-folder")),
              },
              {
                id: "save-file",
                label: "Сохранить",
                shortcut: "Ctrl+S",
                disabled: !activeFile,
                onSelect: saveActiveFile,
              },
            ],
          },
        ],
      },
      {
        id: "edit",
        label: "Правка",
        sections: [
          {
            id: "edit-main",
            items: [
              {
                id: "rename-node",
                label: "Переименовать",
                disabled: !canRenameSelectedNode,
                onSelect: () => dispatch(requestExplorerAction("rename")),
              },
              {
                id: "delete-node",
                label: "Удалить",
                disabled: !canDeleteSelectedNode,
                onSelect: () => dispatch(requestExplorerAction("delete")),
              },
            ],
          },
        ],
      },
      {
        id: "view",
        label: "Вид",
        sections: [
          {
            id: "view-main",
            items: [
              {
                id: "open-search",
                label: activeSearchQuery ? "Открыть поиск и фильтр" : "Открыть поиск",
                onSelect: openSearch,
              },
              {
                id: "toggle-terminal",
                label: isTerminalVisible ? "Скрыть терминал" : "Показать терминал",
                shortcut: "Ctrl+J",
                onSelect: () => (isTerminalVisible ? toggleTerminal() : openTerminal()),
              },
              {
                id: "refresh-tree",
                label: source === "cloud" ? "Обновить облачные проекты" : "Обновить проводник",
                disabled: !canRefreshExplorer,
                onSelect: () => dispatch(requestExplorerAction("refresh")),
              },
              {
                id: "collapse-tree",
                label:
                  source === "cloud"
                    ? "Свернуть активный проект"
                    : "Свернуть всё в проводнике",
                disabled: !canCollapseExplorer,
                onSelect: () => dispatch(requestExplorerAction("collapse-all")),
              },
            ],
          },
        ],
      },
      {
        id: "terminal",
        label: "Терминал",
        sections: [
          {
            id: "terminal-main",
            items: [
              {
                id: "terminal-new",
                label: "Новый терминал",
                onSelect: createTerminal,
              },
              {
                id: "terminal-open",
                label: isTerminalVisible ? "Показать терминал" : "Открыть терминал",
                shortcut: "Ctrl+J",
                onSelect: openTerminal,
              },
              {
                id: "terminal-focus",
                label: "Фокус на терминале",
                disabled: !hasTerminalSession,
                onSelect: focusTerminal,
              },
              {
                id: "terminal-clear",
                label: "Очистить терминал",
                disabled: !isTerminalReady,
                onSelect: () => clearTerminal(activeTerminalId),
              },
              {
                id: "terminal-interrupt",
                label: "Прервать терминал",
                disabled: !hasTerminalSession,
                onSelect: () => interruptTerminal(activeTerminalId),
              },
            ],
          },
          ...(terminalSessions.length > 1
            ? [
                {
                  id: "terminal-sessions",
                  title: "Сессии",
                  items: terminalSessions.map((session) => ({
                    id: `terminal-session-${session.id}`,
                    label: `${session.id === activeTerminalId ? "[активный] " : ""}${session.title}`,
                    onSelect: () => activateTerminal(session.id),
                  })),
                },
              ]
            : []),
        ],
      },
      {
        id: "run",
        label: "Запуск",
        sections: [
          {
            id: "run-main",
            items: [
              {
                id: "run-active",
                label: isRunning ? "Запуск уже выполняется" : "Запустить",
                shortcut: "F5",
                disabled: !isRunning && !canRunActiveTarget,
                onSelect: () => (isRunning ? stopRun() : runSelectedConfiguration()),
              },
              {
                id: "rerun-active",
                label: "Перезапустить",
                disabled: !currentRunSession?.canRerun || isRunning,
                onSelect: rerun,
              },
              {
                id: "edit-configurations",
                label: "Изменить конфигурации...",
                onSelect: openRunConfigurationDialog,
              },
            ],
          },
        ],
      },
      {
        id: "settings",
        label: "Настройки",
        sections: [
          {
            id: "settings-main",
            items: [
              {
                id: "toggle-theme",
                label: settingsLabel,
                onSelect: onToggleTheme,
              },
            ],
          },
        ],
      },
    ],
    [
      activeFile,
      activeSearchQuery,
      activeTerminalId,
      canCollapseExplorer,
      canCreateFile,
      canCreateFolder,
      canCreateProject,
      canDeleteSelectedNode,
      canRenameSelectedNode,
      canRefreshExplorer,
      canRunActiveTarget,
      createTerminal,
      clearTerminal,
      currentRunSession?.canRerun,
      dispatch,
      handleOpenCloudProjectDraft,
      hasTerminalSession,
      isRunning,
      isTerminalReady,
      isTerminalVisible,
      activateTerminal,
      focusTerminal,
      interruptTerminal,
      openRunConfigurationDialog,
      onToggleTheme,
      openFolder,
      openSearch,
      openTerminal,
      rerun,
      runSelectedConfiguration,
      saveActiveFile,
      settingsLabel,
      source,
      stopRun,
      terminalSessions,
      toggleTerminal,
    ],
  );

  const visibleMenus = useMemo(
    () => primaryMenus.filter((menu) => visibleMenuIds.includes(menu.id)),
    [primaryMenus, visibleMenuIds],
  );

  const hiddenMenus = useMemo(
    () => primaryMenus.filter((menu) => !visibleMenuIds.includes(menu.id)),
    [primaryMenus, visibleMenuIds],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRootRef.current?.contains(target) || overlayRootRef.current?.contains(target)) {
        return;
      }

      closeMenus();
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closeMenus]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (searchOverlayRef.current?.contains(target)) {
        return;
      }

      closeSearch();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeSearch, isSearchOpen]);

  useEffect(() => {
    if (openMenuId === "overflow" && hiddenMenus.length === 0) {
      closeMenus();
      return;
    }

    if (!openMenuId || openMenuId === "overflow") {
      return;
    }

    if (!visibleMenuIds.includes(openMenuId)) {
      closeMenus();
    }
  }, [closeMenus, hiddenMenus.length, openMenuId, visibleMenuIds]);

  useEffect(() => {
    if (openMenuId !== "overflow") {
      setOverflowSubmenu(null);
    }
  }, [openMenuId]);

  useLayoutEffect(() => {
    const viewport = menuViewportRef.current;

    if (!viewport) {
      return;
    }

    const recalculateMenus = () => {
      const availableWidth = viewport.clientWidth;
      const totalMenuWidth = primaryMenus.reduce(
        (sum, menu) => sum + (measureRefs.current[menu.id]?.offsetWidth ?? 68),
        0,
      );

      if (totalMenuWidth <= availableWidth) {
        setVisibleMenuIds((currentIds) => {
          const nextIds = primaryMenus.map((menu) => menu.id);

          if (
            currentIds.length === nextIds.length &&
            currentIds.every((menuId, index) => menuId === nextIds[index])
          ) {
            return currentIds;
          }

          return nextIds;
        });
        return;
      }

      const overflowWidth = overflowMeasureRef.current?.offsetWidth ?? 42;
      const visibleLimit = Math.max(0, availableWidth - overflowWidth);
      let usedWidth = 0;
      const nextVisibleIds: string[] = [];

      for (const menu of primaryMenus) {
        const itemWidth = measureRefs.current[menu.id]?.offsetWidth ?? 68;

        if (usedWidth + itemWidth <= visibleLimit) {
          nextVisibleIds.push(menu.id);
          usedWidth += itemWidth;
          continue;
        }

        break;
      }

      if (nextVisibleIds.length === 0 && primaryMenus.length > 0) {
        nextVisibleIds.push(primaryMenus[0].id);
      }

      setVisibleMenuIds((currentIds) => {
        if (
          currentIds.length === nextVisibleIds.length &&
          currentIds.every((menuId, index) => menuId === nextVisibleIds[index])
        ) {
          return currentIds;
        }

        return nextVisibleIds;
      });
    };

    const observer = new ResizeObserver(() => {
      recalculateMenus();
    });

    observer.observe(viewport);
    window.requestAnimationFrame(recalculateMenus);

    return () => {
      observer.disconnect();
    };
  }, [primaryMenus]);

  const handleMenuAction = useCallback(
    async (item: MenuItem) => {
      closeMenus();
      await item.onSelect();
    },
    [closeMenus],
  );

  const openTopLevelMenu = (menuId: string) => {
    closeSearch();
    setOpenMenuId((currentMenuId) => (currentMenuId === menuId ? null : menuId));
    setOverflowSubmenu(null);
  };

  const renderOverlay = () => {
    if (!openMenuId || typeof document === "undefined") {
      return null;
    }

    if (openMenuId === "overflow") {
      const triggerRect = overflowTriggerRef.current?.getBoundingClientRect();

      if (!triggerRect || hiddenMenus.length === 0) {
        return null;
      }

      const mainStyle = getAnchoredPanelStyle(
        triggerRect,
        OVERFLOW_PANEL_WIDTH,
        Math.max(120, hiddenMenus.length * 38 + 12),
        "right",
      );

      return createPortal(
        <div ref={overlayRootRef} className="pointer-events-none fixed inset-0 z-[120]">
          <OverflowPanel
            hiddenMenus={hiddenMenus}
            mainStyle={mainStyle}
            submenuState={overflowSubmenu}
            onOpenSubmenu={(menuId, anchorRect) => {
              setOverflowSubmenu({ menuId, anchorRect });
            }}
            onSelect={(item) => {
              void handleMenuAction(item);
            }}
          />
        </div>,
        document.body,
      );
    }

    const anchorRef = triggerRefs.current[openMenuId];
    const menuConfig = primaryMenus.find((menu) => menu.id === openMenuId) ?? null;

    if (!anchorRef || !menuConfig) {
      return null;
    }

    const anchorRect = anchorRef.getBoundingClientRect();
    const panelStyle = getAnchoredPanelStyle(
      anchorRect,
      MENU_PANEL_WIDTH,
      estimatePanelHeight(menuConfig.sections),
      "left",
    );

    return createPortal(
      <div ref={overlayRootRef} className="pointer-events-none fixed inset-0 z-[120]">
        <MenuPanel
          sections={menuConfig.sections}
          style={panelStyle}
          onSelect={(item) => {
            void handleMenuAction(item);
          }}
        />
      </div>,
      document.body,
    );
  };

  const renderSearchOverlay = () => {
    if (!isSearchOpen || typeof document === "undefined") {
      return null;
    }

    const triggerRect = searchTriggerRef.current?.getBoundingClientRect();

    if (!triggerRect) {
      return null;
    }

    const panelWidth = Math.min(360, Math.max(280, window.innerWidth - 220));
    const panelStyle = getAnchoredPanelStyle(triggerRect, panelWidth, 44, "right");

    return createPortal(
      <div className="pointer-events-none fixed inset-0 z-[130]">
        <div
          ref={searchOverlayRef}
          className="pointer-events-auto fixed"
          style={{
            left: panelStyle.left,
            top: panelStyle.top,
            width: panelStyle.width,
          }}
        >
          <SearchBar
            autoFocus
            className="w-full shadow-[var(--shadow-panel)]"
            onEscape={closeSearch}
            trailing={
              <button
                type="button"
                className="ui-control -mr-1 h-7 w-7 shrink-0"
                aria-label="Закрыть поиск"
                title="Закрыть поиск"
                onClick={closeSearch}
              >
                <VscChromeClose className="h-4 w-4" />
              </button>
            }
          />
        </div>
      </div>,
      document.body,
    );
  };

  return (
    <div className="relative h-12 w-full overflow-visible border-b border-default bg-chrome px-3">
      <div className="pointer-events-none absolute left-3 top-2 invisible flex items-center gap-1">
        {primaryMenus.map((menu) => (
          <button
            key={`measure-${menu.id}`}
            ref={(element) => {
              measureRefs.current[menu.id] = element;
            }}
            type="button"
            className="ui-control h-8 px-3 text-sm"
            tabIndex={-1}
          >
            <span className="flex items-center gap-1">
              <span>{menu.label}</span>
              <VscChevronDown className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}

        <button
          ref={overflowMeasureRef}
          type="button"
          className="ui-control h-8 px-3 text-sm"
          tabIndex={-1}
        >
          <VscEllipsis className="h-4 w-4" />
        </button>
      </div>

      <div className="flex h-full items-center justify-between gap-3">
        <div ref={menuRootRef} className="flex min-w-0 flex-1 items-center gap-3 overflow-visible">
          <button
            type="button"
            className="flex shrink-0 items-center"
            onClick={() => navigate("/")}
            aria-label="Перейти в IDE"
            title="Cross++"
          >
            <img src="/logo.svg" alt="Cross++" className="h-6 w-auto shrink-0" />
          </button>

          <div ref={menuViewportRef} className="min-w-0 flex-1 overflow-visible">
            <div className="flex items-center gap-1 overflow-visible">
              {visibleMenus.map((menu) => (
                <button
                  key={menu.id}
                  ref={(element) => {
                    triggerRefs.current[menu.id] = element;
                  }}
                  type="button"
                  className={`ui-control h-8 shrink-0 px-3 text-sm ${
                    openMenuId === menu.id ? "border border-default bg-active text-primary" : ""
                  }`}
                  onClick={() => openTopLevelMenu(menu.id)}
                  onMouseEnter={() => {
                    if (openMenuId) {
                      setOpenMenuId(menu.id);
                    }
                  }}
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === menu.id}
                >
                  <span className="flex items-center gap-1">
                    <span>{menu.label}</span>
                    <VscChevronDown className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}

              {hiddenMenus.length > 0 ? (
                <button
                  ref={overflowTriggerRef}
                  type="button"
                  className={`ui-control h-8 shrink-0 px-3 text-sm ${
                    openMenuId === "overflow" ? "border border-default bg-active text-primary" : ""
                  }`}
                  onClick={() => openTopLevelMenu("overflow")}
                  onMouseEnter={() => {
                    if (openMenuId) {
                      setOpenMenuId("overflow");
                    }
                  }}
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === "overflow"}
                  aria-label="Дополнительные разделы меню"
                >
                  <VscEllipsis className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <TopBarRunButton />

          <button
            ref={searchTriggerRef}
            type="button"
            className={`ui-control flex h-8 w-8 items-center justify-center ${
              isSearchOpen || activeSearchQuery ? "border border-default bg-active text-primary" : ""
            }`}
            onClick={() => {
              if (isSearchOpen) {
                closeSearch();
                return;
              }

              openSearch();
            }}
            aria-label="Открыть поиск"
            title={activeSearchQuery ? `Поиск: ${activeSearchQuery}` : "Открыть поиск"}
          >
            <IoSearchOutline className="h-4 w-4" />
          </button>

          <TopBarAccountControls />

          <div className="ml-1 flex items-center gap-1 border-l border-default pl-2">
            <TopBarIcon
              icon={TfiLayoutLineSolid}
              onClick={() => window.electronAPI.minimizeWindow()}
            />
            <TopBarIcon
              icon={IoIosSquareOutline}
              onClick={() => window.electronAPI.toggleMaximizeWindow()}
            />
            <TopBarIcon icon={RxCross1} onClick={() => window.electronAPI.closeWindow()} />
          </div>
        </div>
      </div>

      {renderOverlay()}
      {renderSearchOverlay()}
    </div>
  );
}
