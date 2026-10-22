import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TopBarMenuConfig } from "./topBarMenuTypes";

const FALLBACK_MENU_WIDTH = 68;
const FALLBACK_OVERFLOW_WIDTH = 42;

function areMenuIdsEqual(currentIds: string[], nextIds: string[]) {
  return (
    currentIds.length === nextIds.length &&
    currentIds.every((menuId, index) => menuId === nextIds[index])
  );
}

export function useResponsiveTopBarMenus(primaryMenus: TopBarMenuConfig[]) {
  const menuViewportRef = useRef<HTMLDivElement | null>(null);
  const measureRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const overflowMeasureRef = useRef<HTMLButtonElement | null>(null);
  const [visibleMenuIds, setVisibleMenuIds] = useState<string[]>(() =>
    primaryMenus.map((menu) => menu.id),
  );

  const visibleMenus = useMemo(
    () => primaryMenus.filter((menu) => visibleMenuIds.includes(menu.id)),
    [primaryMenus, visibleMenuIds],
  );
  const hiddenMenus = useMemo(
    () => primaryMenus.filter((menu) => !visibleMenuIds.includes(menu.id)),
    [primaryMenus, visibleMenuIds],
  );

  useLayoutEffect(() => {
    const viewport = menuViewportRef.current;

    if (!viewport) {
      return;
    }

    const recalculateMenus = () => {
      const availableWidth = viewport.clientWidth;
      const totalMenuWidth = primaryMenus.reduce(
        (sum, menu) => sum + (measureRefs.current[menu.id]?.offsetWidth ?? FALLBACK_MENU_WIDTH),
        0,
      );

      if (totalMenuWidth <= availableWidth) {
        const nextIds = primaryMenus.map((menu) => menu.id);
        setVisibleMenuIds((currentIds) =>
          areMenuIdsEqual(currentIds, nextIds) ? currentIds : nextIds,
        );
        return;
      }

      const overflowWidth = overflowMeasureRef.current?.offsetWidth ?? FALLBACK_OVERFLOW_WIDTH;
      const visibleLimit = Math.max(0, availableWidth - overflowWidth);
      let usedWidth = 0;
      const nextVisibleIds: string[] = [];

      for (const menu of primaryMenus) {
        const itemWidth = measureRefs.current[menu.id]?.offsetWidth ?? FALLBACK_MENU_WIDTH;

        if (usedWidth + itemWidth > visibleLimit) {
          break;
        }

        nextVisibleIds.push(menu.id);
        usedWidth += itemWidth;
      }

      if (nextVisibleIds.length === 0 && primaryMenus.length > 0) {
        nextVisibleIds.push(primaryMenus[0].id);
      }

      setVisibleMenuIds((currentIds) =>
        areMenuIdsEqual(currentIds, nextVisibleIds) ? currentIds : nextVisibleIds,
      );
    };

    const observer = new ResizeObserver(recalculateMenus);
    observer.observe(viewport);
    window.requestAnimationFrame(recalculateMenus);

    return () => {
      observer.disconnect();
    };
  }, [primaryMenus]);

  return {
    hiddenMenus,
    measureRefs,
    menuViewportRef,
    overflowMeasureRef,
    visibleMenuIds,
    visibleMenus,
  };
}
