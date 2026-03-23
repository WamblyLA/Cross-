import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiMoon, FiSun, FiUser } from "react-icons/fi";
import { IoIosSquareOutline } from "react-icons/io";
import { RxCross1 } from "react-icons/rx";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import { VscChevronDown, VscEllipsis, VscPlay } from "react-icons/vsc";
import { requestExplorerAction } from "../../features/workspace/workspaceSlice";
import { useDesktopActions } from "../../hooks/useDesktopActions";
import { useRequest } from "../../hooks/useRequest";
import type { ThemeName } from "../../styles/tokens";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import SearchBar from "../../ui/SearchBar";
import TopBarIcon from "./TopBarIcon";

type TopBarProps = {
  theme: ThemeName;
  onToggleTheme: () => void;
};

type MeResponse = {
  user: {
    id: string;
    email: string;
  };
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
              {item.shortcut ? <span className="text-[11px] text-muted">{item.shortcut}</span> : null}
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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const menuViewportRef = useRef<HTMLDivElement | null>(null);
  const measureRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const overflowMeasureRef = useRef<HTMLButtonElement | null>(null);
  const overflowTriggerRef = useRef<HTMLButtonElement | null>(null);
  const runDropdownRef = useRef<HTMLButtonElement | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [visibleMenuIds, setVisibleMenuIds] = useState<string[]>([
    "file",
    "edit",
    "view",
    "run",
    "terminal",
  ]);
  const [overflowSubmenu, setOverflowSubmenu] = useState<OverflowSubmenuState | null>(null);

  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const selectedPath = useAppSelector((state) => state.workspace.selectedPath);
  const isTerminalVisible = useAppSelector((state) => state.runner.isVisible);
  const isTerminalReady = useAppSelector((state) => state.runner.isReady);
  const isRunning = useAppSelector((state) => state.runner.isRunning);
  const {
    activeFile,
    openFolder,
    saveActiveFile,
    runActivePythonFile,
    openTerminal,
    toggleTerminal,
    clearTerminal,
  } = useDesktopActions();

  const { data: meData, refetch: refetchMe } = useRequest<MeResponse>({
    url: "/api/auth/me",
    auto: true,
    retry: 0,
  });

  const { refetch: logoutRequest } = useRequest<{ success: true }>({
    url: "/api/auth/logout",
    method: "POST",
    auto: false,
  });

  const closeMenus = useCallback(() => {
    setOpenMenuId(null);
    setOverflowSubmenu(null);
  }, []);

  const canEditSelectedNode = Boolean(selectedPath && selectedPath !== rootPath);
  const hasActivePythonFile = activeFile?.extension?.toLowerCase() === "py";
  const canRunActivePython = Boolean(activeFile && hasActivePythonFile && !isRunning);

  const primaryMenus = useMemo<MenuConfig[]>(
    () => [
      {
        id: "file",
        label: "File",
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
                id: "new-file",
                label: "Новый файл",
                shortcut: "Ctrl+N",
                disabled: !rootPath,
                onSelect: () => dispatch(requestExplorerAction("create-file")),
              },
              {
                id: "new-folder",
                label: "Новая папка",
                shortcut: "Ctrl+Shift+N",
                disabled: !rootPath,
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
        label: "Edit",
        sections: [
          {
            id: "edit-main",
            items: [
              {
                id: "rename-node",
                label: "Переименовать",
                disabled: !canEditSelectedNode,
                onSelect: () => dispatch(requestExplorerAction("rename")),
              },
              {
                id: "delete-node",
                label: "Удалить",
                disabled: !canEditSelectedNode,
                onSelect: () => dispatch(requestExplorerAction("delete")),
              },
            ],
          },
        ],
      },
      {
        id: "view",
        label: "View",
        sections: [
          {
            id: "view-main",
            items: [
              {
                id: "toggle-terminal",
                label: isTerminalVisible ? "Скрыть терминал" : "Показать терминал",
                shortcut: "Ctrl+J",
                onSelect: () => (isTerminalVisible ? toggleTerminal() : openTerminal()),
              },
              {
                id: "refresh-tree",
                label: "Обновить проводник",
                disabled: !rootPath,
                onSelect: () => dispatch(requestExplorerAction("refresh")),
              },
              {
                id: "collapse-tree",
                label: "Свернуть все в проводнике",
                disabled: !rootPath,
                onSelect: () => dispatch(requestExplorerAction("collapse-all")),
              },
              {
                id: "toggle-theme",
                label: "Переключить тему",
                onSelect: onToggleTheme,
              },
            ],
          },
        ],
      },
      {
        id: "run",
        label: "Run",
        sections: [
          {
            id: "run-main",
            items: [
              {
                id: "run-python",
                label: isRunning ? "Запуск уже выполняется" : "Запустить",
                shortcut: "F5",
                disabled: !canRunActivePython,
                onSelect: runActivePythonFile,
              },
              {
                id: "debug-python",
                label: "Отладка",
                disabled: true,
                onSelect: () => undefined,
              },
            ],
          },
        ],
      },
      {
        id: "terminal",
        label: "Terminal",
        sections: [
          {
            id: "terminal-main",
            items: [
              {
                id: "show-terminal",
                label: isTerminalVisible ? "Скрыть терминал" : "Открыть терминал",
                shortcut: "Ctrl+J",
                onSelect: () => (isTerminalVisible ? toggleTerminal() : openTerminal()),
              },
              {
                id: "clear-terminal",
                label: "Очистить терминал",
                disabled: !isTerminalReady,
                onSelect: clearTerminal,
              },
            ],
          },
        ],
      },
    ],
    [
      activeFile,
      canEditSelectedNode,
      canRunActivePython,
      clearTerminal,
      dispatch,
      isRunning,
      isTerminalReady,
      isTerminalVisible,
      onToggleTheme,
      openFolder,
      openTerminal,
      rootPath,
      runActivePythonFile,
      saveActiveFile,
      toggleTerminal,
    ],
  );

  const runMenu = useMemo<MenuConfig>(() => {
    return (
      primaryMenus.find((menu) => menu.id === "run") ?? {
        id: "run",
        label: "Run",
        sections: [],
      }
    );
  }, [primaryMenus]);

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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeMenus]);

  useEffect(() => {
    if (openMenuId === "overflow" && hiddenMenus.length === 0) {
      closeMenus();
      return;
    }

    if (!openMenuId || openMenuId === "overflow" || openMenuId === "run-control") {
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

  const handleLogout = async () => {
    try {
      await logoutRequest();
      await refetchMe();
      window.location.reload();
    } catch (error) {
      console.error("Ошибка выхода из аккаунта", error);
    }
  };

  const handleMenuAction = useCallback(
    async (item: MenuItem) => {
      closeMenus();
      await item.onSelect();
    },
    [closeMenus],
  );

  const handleRunClick = async () => {
    closeMenus();
    await runActivePythonFile();
  };

  const openTopLevelMenu = (menuId: string) => {
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

    const anchorRef =
      openMenuId === "run-control" ? runDropdownRef.current : triggerRefs.current[openMenuId];
    const menuConfig =
      openMenuId === "run-control"
        ? runMenu
        : primaryMenus.find((menu) => menu.id === openMenuId) ?? null;

    if (!anchorRef || !menuConfig) {
      return null;
    }

    const anchorRect = anchorRef.getBoundingClientRect();
    const panelStyle = getAnchoredPanelStyle(
      anchorRect,
      MENU_PANEL_WIDTH,
      estimatePanelHeight(menuConfig.sections),
      openMenuId === "run-control" ? "right" : "left",
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

      <div className="flex h-full items-center gap-3">
        <div ref={menuRootRef} className="flex min-w-0 flex-1 items-center gap-3 overflow-visible">
          <img src="/logo.svg" alt="Cross++" className="h-6 w-auto shrink-0" />

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
                    if (openMenuId && openMenuId !== "run-control") {
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
                    if (openMenuId && openMenuId !== "run-control") {
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

        <div className="min-w-[150px] max-w-[280px] flex-[0_1_240px]">
          <SearchBar />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 items-stretch overflow-hidden rounded-[10px] border border-default bg-panel">
            <button
              type="button"
              className="flex items-center gap-1 px-3 text-sm text-primary transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:text-muted"
              onClick={() => {
                void handleRunClick();
              }}
              disabled={!canRunActivePython}
              title="Запустить текущий Python-файл"
            >
              <VscPlay className="h-4 w-4" />
              <span>Run</span>
            </button>

            <button
              ref={runDropdownRef}
              type="button"
              className={`border-l border-default px-2 text-primary transition-colors hover:bg-hover ${
                openMenuId === "run-control" ? "bg-active" : ""
              }`}
              onClick={() => openTopLevelMenu("run-control")}
              aria-haspopup="menu"
              aria-expanded={openMenuId === "run-control"}
              title="Параметры запуска"
            >
              <VscChevronDown className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="ui-control flex h-8 w-8 items-center justify-center"
            title={theme === "dark" ? "Включить светлую тему" : "Включить темную тему"}
            aria-label={theme === "dark" ? "Включить светлую тему" : "Включить темную тему"}
          >
            {theme === "dark" ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
          </button>

          {meData?.user ? (
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <FiUser className="h-4 w-4 shrink-0 text-secondary" />
              <span className="hidden max-w-40 truncate text-secondary xl:block">
                {meData.user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="ui-control h-8 shrink-0 px-3 text-sm"
              >
                Выйти
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="ui-control h-8 px-3 text-sm"
            >
              Войти
            </button>
          )}

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
    </div>
  );
}
