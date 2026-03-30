import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

export type MenuAction = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
  onSelect: () => void | Promise<void>;
};

export type MenuSection = {
  id: string;
  title?: string;
  items: MenuAction[];
};

export type MenuPosition =
  | {
      type: "anchor";
      rect: DOMRect;
      align?: "left" | "right";
    }
  | {
      type: "point";
      x: number;
      y: number;
    };

type FloatingMenuProps = {
  sections: MenuSection[];
  position: MenuPosition;
  onClose: () => void;
  width?: number;
};

const VIEWPORT_GAP = 8;
const MENU_OFFSET = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function estimateMenuHeight(sections: MenuSection[]) {
  return sections.reduce((height, section, index) => {
    const itemsHeight = section.items.length * 36;
    const titleHeight = section.title ? 22 : 0;
    const dividerHeight = index > 0 ? 10 : 0;
    return height + itemsHeight + titleHeight + dividerHeight + 12;
  }, 8);
}

function resolveMenuStyle(position: MenuPosition, width: number, height: number) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = Math.max(VIEWPORT_GAP, viewportWidth - width - VIEWPORT_GAP);
  const maxTop = Math.max(VIEWPORT_GAP, viewportHeight - height - VIEWPORT_GAP);

  if (position.type === "point") {
    return {
      left: clamp(position.x, VIEWPORT_GAP, maxLeft),
      top: clamp(position.y, VIEWPORT_GAP, maxTop),
      width,
    };
  }

  const preferredLeft =
    position.align === "right" ? position.rect.right - width : position.rect.left;
  const left = clamp(preferredLeft, VIEWPORT_GAP, maxLeft);
  const belowTop = position.rect.bottom + MENU_OFFSET;
  const top =
    belowTop + height <= viewportHeight - VIEWPORT_GAP
      ? belowTop
      : clamp(position.rect.top - height - MENU_OFFSET, VIEWPORT_GAP, maxTop);

  return {
    left,
    top,
    width,
  };
}

export default function FloatingMenu({
  sections,
  position,
  onClose,
  width = 224,
}: FloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSections = useMemo(
    () => sections.filter((section) => section.items.length > 0),
    [sections],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleViewportChange = () => {
      onClose();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [onClose]);

  if (normalizedSections.length === 0 || typeof document === "undefined") {
    return null;
  }

  const style = resolveMenuStyle(position, width, estimateMenuHeight(normalizedSections));

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[140]">
      <div
        ref={menuRef}
        className="ui-menu pointer-events-auto fixed"
        style={style}
        role="menu"
      >
        {normalizedSections.map((section, sectionIndex) => (
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
                disabled={item.disabled}
                role="menuitem"
                className={`ui-menu-item ${
                  item.disabled
                    ? "cursor-not-allowed text-muted"
                    : item.tone === "danger"
                      ? "ui-menu-item-danger"
                      : "text-secondary"
                }`}
                onClick={() => {
                  void Promise.resolve(item.onSelect()).finally(onClose);
                }}
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
    </div>,
    document.body,
  );
}
