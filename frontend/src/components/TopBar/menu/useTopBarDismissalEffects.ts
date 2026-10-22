import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { OverflowSubmenuState } from "./topBarMenuTypes";

type UseTopBarDismissalEffectsOptions = {
  closeMenus: () => void;
  closeSearch: () => void;
  hiddenMenuCount: number;
  isSearchOpen: boolean;
  menuRootRef: RefObject<HTMLDivElement | null>;
  openMenuId: string | null;
  overlayRootRef: RefObject<HTMLDivElement | null>;
  searchOverlayRef: RefObject<HTMLDivElement | null>;
  setOverflowSubmenu: Dispatch<SetStateAction<OverflowSubmenuState | null>>;
  visibleMenuIds: string[];
};

export function useTopBarDismissalEffects({
  closeMenus,
  closeSearch,
  hiddenMenuCount,
  isSearchOpen,
  menuRootRef,
  openMenuId,
  overlayRootRef,
  searchOverlayRef,
  setOverflowSubmenu,
  visibleMenuIds,
}: UseTopBarDismissalEffectsOptions) {
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!menuRootRef.current?.contains(target) && !overlayRootRef.current?.contains(target)) {
        closeMenus();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [closeMenus, menuRootRef, overlayRootRef]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!searchOverlayRef.current?.contains(event.target as Node)) {
        closeSearch();
      }
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
  }, [closeSearch, isSearchOpen, searchOverlayRef]);

  useEffect(() => {
    if (openMenuId === "overflow" && hiddenMenuCount === 0) {
      closeMenus();
    } else if (openMenuId && openMenuId !== "overflow" && !visibleMenuIds.includes(openMenuId)) {
      closeMenus();
    }
  }, [closeMenus, hiddenMenuCount, openMenuId, visibleMenuIds]);

  useEffect(() => {
    if (openMenuId !== "overflow") {
      setOverflowSubmenu(null);
    }
  }, [openMenuId, setOverflowSubmenu]);
}
