import { VscChevronDown } from "react-icons/vsc";
import {
  estimatePanelHeight,
  getSubmenuPanelStyle,
  MENU_PANEL_WIDTH,
} from "./topBarPanelPosition";
import type {
  OverflowSubmenuState,
  TopBarMenuConfig,
  TopBarMenuItem,
  TopBarMenuSection,
} from "./topBarMenuTypes";

export function TopBarMenuPanel({
  sections,
  style,
  onSelect,
}: {
  sections: TopBarMenuSection[];
  style: { left: number; top: number; width: number };
  onSelect: (item: TopBarMenuItem) => void;
}) {
  return (
    <div
      className="ui-menu pointer-events-auto fixed z-[120]"
      style={style}
      role="menu"
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.id}
          className={sectionIndex > 0 ? "mt-1 border-t border-default pt-1" : ""}
        >
          {section.title ? (
            <div className="ui-menu-section-title ui-eyebrow">{section.title}</div>
          ) : null}

          {section.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ui-menu-item ${
                item.disabled
                  ? "cursor-not-allowed text-muted"
                  : "text-secondary"
              }`}
              disabled={item.disabled}
              onClick={() => onSelect(item)}
              role="menuitem"
            >
              <span>{item.label}</span>
              {item.shortcut ? (
                <span className="text-xs text-muted">{item.shortcut}</span>
              ) : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function TopBarOverflowPanel({
  hiddenMenus,
  mainStyle,
  submenuState,
  onOpenSubmenu,
  onSelect,
}: {
  hiddenMenus: TopBarMenuConfig[];
  mainStyle: { left: number; top: number; width: number };
  submenuState: OverflowSubmenuState | null;
  onOpenSubmenu: (menuId: string, anchorRect: DOMRect) => void;
  onSelect: (item: TopBarMenuItem) => void;
}) {
  const submenuConfig =
    hiddenMenus.find((menu) => menu.id === submenuState?.menuId) ?? null;
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
        className="ui-menu pointer-events-auto fixed z-[120]"
        style={mainStyle}
        role="menu"
      >
        {hiddenMenus.map((menu) => (
          <button
            key={menu.id}
            type="button"
            className={`ui-menu-item ${
              submenuState?.menuId === menu.id
                ? "bg-hover text-primary"
                : "text-secondary"
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
        <TopBarMenuPanel
          sections={submenuConfig.sections}
          style={submenuStyle}
          onSelect={onSelect}
        />
      ) : null}
    </>
  );
}
