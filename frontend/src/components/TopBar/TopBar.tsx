import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUsers } from "react-icons/fi";
import { IoIosSquareOutline } from "react-icons/io";
import { IoSearchOutline } from "react-icons/io5";
import { RxCross1 } from "react-icons/rx";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import logoUrl from "../../assets/logo.svg";
import { selectIsAuthenticated } from "../../features/auth/authSelectors";
import {
  selectCloudActiveProjectId,
  selectCloudCanDeleteSelection,
  selectCloudCanRenameSingle,
  selectCloudCanWriteProject,
} from "../../features/cloud/cloudSelectors";
import { requestExplorerAction, setWorkspaceSource } from "../../features/workspace/workspaceSlice";
import { useAppCommandExecutor } from "../../hooks/useAppCommandExecutor";
import { useDesktopActions } from "../../hooks/useDesktopActions";
import { useRunActions } from "../../hooks/useRunActions";
import { useWorkspaceActions } from "../../hooks/useWorkspaceActions";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import TopBarAccountControls from "./TopBarAccountControls";
import TopBarIcon from "./TopBarIcon";
import TopBarMenuBar from "./TopBarMenuBar";
import { TopBarMenuPanel, TopBarOverflowPanel } from "./TopBarMenuPanels";
import TopBarNotificationsInbox from "./TopBarNotificationsInbox";
import TopBarRunButton from "./TopBarRunButton";
import TopBarSearchOverlay from "./TopBarSearchOverlay";
import {
  estimatePanelHeight,
  getAnchoredPanelStyle,
  MENU_PANEL_WIDTH,
  OVERFLOW_PANEL_WIDTH,
} from "./topBarPanelPosition";
import { TOP_BAR_STRINGS } from "./topBarStrings";
import type {
  OverflowSubmenuState,
  TopBarMenuConfig,
  TopBarMenuItem,
} from "./topBarMenuTypes";
import { useTopBarMenus } from "./useTopBarMenus";

type TopBarProps = {
  onOpenBugReport: () => void;
  onOpenProjectMembers: () => void;
  onOpenVisualSettings: () => void;
};

export default function TopBar({
  onOpenBugReport,
  onOpenProjectMembers,
  onOpenVisualSettings,
}: TopBarProps) {
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
    "help",
  ]);
  const [overflowSubmenu, setOverflowSubmenu] =
    useState<OverflowSubmenuState | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const selectedPath = useAppSelector((state) => state.workspace.selectedPath);
  const selectionCount = useAppSelector((state) => state.workspace.selectionCount);
  const activeSearchQuery = useAppSelector((state) => state.workspace.searchQuery);
  const activeCloudProjectId = useAppSelector(selectCloudActiveProjectId);
  const activeCloudProject = useAppSelector((state) =>
    state.cloud.projects.find((project) => project.id === activeCloudProjectId) ?? null,
  );
  const canRenameCloudSelection = useAppSelector(selectCloudCanRenameSingle);
  const canDeleteCloudSelection = useAppSelector(selectCloudCanDeleteSelection);
  const canWriteCloudProject = useAppSelector(selectCloudCanWriteProject);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isTerminalVisible = useAppSelector(
    (state) => state.panel.isVisible && state.panel.activeTab === "terminal",
  );
  const isTerminalReady = useAppSelector((state) => state.terminal.isReady);
  const activeTerminalId = useAppSelector((state) => state.terminal.activeTerminalId);
  const terminalSessions = useAppSelector((state) => state.terminal.sessions);
  const terminalProfiles = useAppSelector((state) => state.terminal.profiles);
  const defaultTerminalProfileId = useAppSelector(
    (state) => state.terminal.defaultProfileId,
  );
  const terminalProfileDiscoveryStatus = useAppSelector(
    (state) => state.terminal.profileDiscoveryStatus,
  );
  const currentRunSession = useAppSelector((state) => state.run.currentSession);
  const isRunning = Boolean(
    currentRunSession &&
      ["preparing", "materializing", "building", "running"].includes(
        currentRunSession.status,
      ),
  );

  const {
    activateTerminal,
    clearTerminal,
    closeTerminal,
    createTerminal,
    focusTerminal,
    interruptTerminal,
    openTerminal,
    setDefaultTerminalProfile,
  } = useDesktopActions();
  const executeCommand = useAppCommandExecutor();
  const { activeFile } = useWorkspaceActions();
  const { openRunConfigurationDialog, rerun } = useRunActions();

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
      ? canRenameCloudSelection
      : selectionCount === 1 && Boolean(selectedPath && selectedPath !== rootPath);
  const canDeleteSelectedNode =
    source === "cloud"
      ? canDeleteCloudSelection
      : selectionCount > 0 && Boolean(selectedPath && selectedPath !== rootPath);
  const canCreateFile =
    source === "cloud"
      ? isAuthenticated && Boolean(activeCloudProjectId) && canWriteCloudProject
      : Boolean(rootPath);
  const canCreateFolder =
    source === "cloud"
      ? isAuthenticated && Boolean(activeCloudProjectId) && canWriteCloudProject
      : Boolean(rootPath);
  const canCreateProject = isAuthenticated;
  const canRefreshExplorer = source === "cloud" ? isAuthenticated : Boolean(rootPath);
  const canCollapseExplorer =
    source === "cloud"
      ? isAuthenticated && Boolean(activeCloudProjectId)
      : Boolean(rootPath);
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

  const terminalCreateProfileItems = useMemo(
    () =>
      terminalProfiles.map((profile) => ({
        id: `terminal-create-profile-${profile.id}`,
        label: profile.label,
        disabled: !profile.isAvailable,
        onSelect: () => createTerminal(profile.id),
      })),
    [createTerminal, terminalProfiles],
  );

  const terminalDefaultProfileItems = useMemo(
    () =>
      terminalProfiles.map((profile) => ({
        id: `terminal-default-profile-${profile.id}`,
        label: `${profile.id === defaultTerminalProfileId ? "● " : ""}${profile.label}`,
        disabled: !profile.isAvailable,
        onSelect: () => setDefaultTerminalProfile(profile.id),
      })),
    [defaultTerminalProfileId, setDefaultTerminalProfile, terminalProfiles],
  );

  const primaryMenus = useTopBarMenus({
    source,
    activeFile,
    activeSearchQuery,
    activeTerminalId,
    activeCloudProjectId,
    canCollapseExplorer,
    canCreateFile,
    canCreateFolder,
    canCreateProject,
    canDeleteSelectedNode,
    canRenameSelectedNode,
    canRefreshExplorer,
    canRunActiveTarget,
    currentRunSessionCanRerun: Boolean(currentRunSession?.canRerun),
    hasTerminalSession,
    isRunning,
    isTerminalReady,
    isTerminalVisible,
    terminalProfileDiscoveryStatus,
    terminalSessions,
    terminalCreateProfileItems,
    terminalDefaultProfileItems,
    activateTerminal,
    clearTerminal,
    closeTerminal,
    dispatchExplorerAction: (type) => dispatch(requestExplorerAction(type as never)),
    executeCommand,
    focusTerminal,
    handleOpenCloudProjectDraft,
    interruptTerminal,
    onOpenVisualSettings,
    openRunConfigurationDialog,
    openSearch,
    openTerminal,
    rerun,
  });
  const primaryMenusWithHelp = useMemo<TopBarMenuConfig[]>(
    () => [
      ...primaryMenus,
      {
        id: "help",
        label: "Помощь",
        sections: [
          {
            id: "help-main",
            items: [
              {
                id: "report-bug",
                label: "Сообщить об ошибке",
                onSelect: onOpenBugReport,
              },
            ],
          },
        ],
      },
    ],
    [onOpenBugReport, primaryMenus],
  );

  const visibleMenus = useMemo(
    () => primaryMenusWithHelp.filter((menu) => visibleMenuIds.includes(menu.id)),
    [primaryMenusWithHelp, visibleMenuIds],
  );

  const hiddenMenus = useMemo(
    () => primaryMenusWithHelp.filter((menu) => !visibleMenuIds.includes(menu.id)),
    [primaryMenusWithHelp, visibleMenuIds],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        menuRootRef.current?.contains(target) ||
        overlayRootRef.current?.contains(target)
      ) {
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
      const totalMenuWidth = primaryMenusWithHelp.reduce(
        (sum, menu) => sum + (measureRefs.current[menu.id]?.offsetWidth ?? 68),
        0,
      );

      if (totalMenuWidth <= availableWidth) {
        setVisibleMenuIds((currentIds) => {
          const nextIds = primaryMenusWithHelp.map((menu) => menu.id);

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

      for (const menu of primaryMenusWithHelp) {
        const itemWidth = measureRefs.current[menu.id]?.offsetWidth ?? 68;

        if (usedWidth + itemWidth <= visibleLimit) {
          nextVisibleIds.push(menu.id);
          usedWidth += itemWidth;
          continue;
        }

        break;
      }

      if (nextVisibleIds.length === 0 && primaryMenusWithHelp.length > 0) {
        nextVisibleIds.push(primaryMenusWithHelp[0].id);
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
  }, [primaryMenusWithHelp]);

  const handleMenuAction = useCallback(
    async (item: TopBarMenuItem) => {
      closeMenus();
      await item.onSelect();
    },
    [closeMenus],
  );

  const openTopLevelMenu = useCallback(
    (menuId: string) => {
      closeSearch();
      setOpenMenuId((currentMenuId) => (currentMenuId === menuId ? null : menuId));
      setOverflowSubmenu(null);
    },
    [closeSearch],
  );

  const handleHoverMenu = useCallback(
    (menuId: string) => {
      if (openMenuId) {
        setOpenMenuId(menuId);
      }
    },
    [openMenuId],
  );

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
        <div
          ref={overlayRootRef}
          className="pointer-events-none fixed inset-0 z-[120]"
        >
          <TopBarOverflowPanel
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
    const menuConfig = primaryMenusWithHelp.find((menu) => menu.id === openMenuId) ?? null;

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
      <div
        ref={overlayRootRef}
        className="pointer-events-none fixed inset-0 z-[120]"
      >
        <TopBarMenuPanel
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
      <div className="flex h-full items-center justify-between gap-3">
        <div
          ref={menuRootRef}
          className="flex min-w-0 flex-1 items-center gap-3 overflow-visible"
        >
          <button
            type="button"
            className="flex shrink-0 items-center"
            onClick={() => navigate("/")}
            aria-label="Перейти в IDE"
            title="Cross++"
          >
            <img src={logoUrl} alt="Cross++" className="h-6 w-auto shrink-0" />
          </button>

          <TopBarMenuBar
            primaryMenus={primaryMenusWithHelp}
            visibleMenus={visibleMenus}
            hiddenMenus={hiddenMenus}
            openMenuId={openMenuId}
            menuViewportRef={menuViewportRef}
            measureRefs={measureRefs}
            triggerRefs={triggerRefs}
            overflowMeasureRef={overflowMeasureRef}
            overflowTriggerRef={overflowTriggerRef}
            onOpenMenu={openTopLevelMenu}
            onHoverMenu={handleHoverMenu}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {source === "cloud" && activeCloudProject ? (
            <button
              type="button"
              className="ui-control flex h-8 items-center gap-2 px-3 text-sm"
              onClick={onOpenProjectMembers}
              title="Участники проекта"
            >
              <FiUsers className="h-4 w-4" />
              <span>Участники</span>
            </button>
          ) : null}

          <TopBarRunButton />

          {isAuthenticated ? <TopBarNotificationsInbox /> : null}

          <button
            ref={searchTriggerRef}
            type="button"
            className={`ui-control flex h-8 w-8 items-center justify-center ${
              isSearchOpen || activeSearchQuery
                ? "border border-default bg-active text-primary"
                : ""
            }`}
            onClick={() => {
              if (isSearchOpen) {
                closeSearch();
                return;
              }

              openSearch();
            }}
            aria-label={TOP_BAR_STRINGS.searchTitle}
            title={
              activeSearchQuery
                ? `${TOP_BAR_STRINGS.searchWithQueryPrefix}${activeSearchQuery}`
                : TOP_BAR_STRINGS.searchTitle
            }
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
      <TopBarSearchOverlay
        isOpen={isSearchOpen}
        triggerRef={searchTriggerRef}
        overlayRef={searchOverlayRef}
        onClose={closeSearch}
      />
    </div>
  );
}
