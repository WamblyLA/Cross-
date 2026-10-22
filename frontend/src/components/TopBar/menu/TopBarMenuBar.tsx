import type { MutableRefObject, RefObject } from "react";
import { VscChevronDown, VscEllipsis } from "react-icons/vsc";
import type { TopBarMenuConfig } from "./topBarMenuTypes";

type TopBarMenuBarProps = {
  primaryMenus: TopBarMenuConfig[];
  visibleMenus: TopBarMenuConfig[];
  hiddenMenus: TopBarMenuConfig[];
  openMenuId: string | null;
  menuViewportRef: RefObject<HTMLDivElement | null>;
  measureRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  triggerRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  overflowMeasureRef: RefObject<HTMLButtonElement | null>;
  overflowTriggerRef: RefObject<HTMLButtonElement | null>;
  onOpenMenu: (menuId: string) => void;
  onHoverMenu: (menuId: string) => void;
};

export default function TopBarMenuBar({
  primaryMenus,
  visibleMenus,
  hiddenMenus,
  openMenuId,
  menuViewportRef,
  measureRefs,
  triggerRefs,
  overflowMeasureRef,
  overflowTriggerRef,
  onOpenMenu,
  onHoverMenu,
}: TopBarMenuBarProps) {
  return (
    <>
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
                openMenuId === menu.id
                  ? "border border-default bg-active text-primary"
                  : ""
              }`}
              onClick={() => onOpenMenu(menu.id)}
              onMouseEnter={() => onHoverMenu(menu.id)}
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
                openMenuId === "overflow"
                  ? "border border-default bg-active text-primary"
                  : ""
              }`}
              onClick={() => onOpenMenu("overflow")}
              onMouseEnter={() => onHoverMenu("overflow")}
              aria-haspopup="menu"
              aria-expanded={openMenuId === "overflow"}
              aria-label="Дополнительные разделы меню"
            >
              <VscEllipsis className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
