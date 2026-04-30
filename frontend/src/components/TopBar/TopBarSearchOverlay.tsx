import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { VscChromeClose } from "react-icons/vsc";
import SearchBar from "../../ui/SearchBar";
import { getAnchoredPanelStyle } from "./topBarPanelPosition";

type TopBarSearchOverlayProps = {
  isOpen: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

export default function TopBarSearchOverlay({
  isOpen,
  triggerRef,
  overlayRef,
  onClose,
}: TopBarSearchOverlayProps) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const triggerRect = triggerRef.current?.getBoundingClientRect();

  if (!triggerRect) {
    return null;
  }

  const panelWidth = Math.min(360, Math.max(280, window.innerWidth - 220));
  const panelStyle = getAnchoredPanelStyle(triggerRect, panelWidth, 44, "right");

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[130]">
      <div
        ref={overlayRef}
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
          onEscape={onClose}
          trailing={
            <button
              type="button"
              className="ui-control -mr-1 h-7 w-7 shrink-0"
              aria-label="Закрыть поиск"
              title="Закрыть поиск"
              onClick={onClose}
            >
              <VscChromeClose className="h-4 w-4" />
            </button>
          }
        />
      </div>
    </div>,
    document.body,
  );
}
