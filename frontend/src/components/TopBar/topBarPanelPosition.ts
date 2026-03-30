import type { TopBarMenuSection } from "./topBarMenuTypes";

export const MENU_PANEL_WIDTH = 248;
export const OVERFLOW_PANEL_WIDTH = 188;
const VIEWPORT_GAP = 8;
const OVERLAY_OFFSET = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function estimatePanelHeight(sections: TopBarMenuSection[]) {
  return sections.reduce((height, section, index) => {
    const sectionGap = index > 0 ? 10 : 0;
    const titleHeight = section.title ? 22 : 0;
    const itemsHeight = section.items.length * 36;
    return height + sectionGap + titleHeight + itemsHeight + 12;
  }, 8);
}

export function getAnchoredPanelStyle(
  anchorRect: DOMRect,
  width: number,
  height: number,
  align: "left" | "right" = "left",
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = Math.max(VIEWPORT_GAP, viewportWidth - width - VIEWPORT_GAP);
  const preferredLeft =
    align === "right" ? anchorRect.right - width : anchorRect.left;
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

export function getSubmenuPanelStyle(
  anchorRect: DOMRect,
  width: number,
  height: number,
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const canOpenRight =
    anchorRect.right + OVERLAY_OFFSET + width <= viewportWidth - VIEWPORT_GAP;
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
