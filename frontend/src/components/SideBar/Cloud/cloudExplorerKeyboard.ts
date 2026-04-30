import type { CloudSelectionEntry } from "../../../features/cloud/cloudSelection";

type MoveCloudSelectionArgs = {
  visibleItems: CloudSelectionEntry[];
  focusedItemKey: string | null;
  selectedItemKeys: string[];
  selectionAnchorKey: string | null;
  delta: number;
  extendSelection: boolean;
};

export function moveCloudSelectionByOffset({
  visibleItems,
  focusedItemKey,
  selectedItemKeys,
  selectionAnchorKey,
  delta,
  extendSelection,
}: MoveCloudSelectionArgs) {
  if (visibleItems.length === 0) {
    return null;
  }

  const visibleKeys = visibleItems.map((item) => item.key);
  const currentKey = focusedItemKey ?? selectedItemKeys[0] ?? visibleKeys[0] ?? null;
  const currentIndex = currentKey ? Math.max(0, visibleKeys.indexOf(currentKey)) : 0;
  const nextIndex = Math.max(0, Math.min(visibleItems.length - 1, currentIndex + delta));
  const nextItem = visibleItems[nextIndex];

  if (!nextItem) {
    return null;
  }

  if (!extendSelection) {
    return {
      items: [nextItem],
      focusedItemKey: nextItem.key,
      selectionAnchorKey: nextItem.key,
    };
  }

  const rangeStartKey = selectionAnchorKey ?? focusedItemKey ?? nextItem.key;
  const startIndex = visibleKeys.indexOf(rangeStartKey);
  const [from, to] = startIndex <= nextIndex ? [startIndex, nextIndex] : [nextIndex, startIndex];

  return {
    items: visibleItems.slice(from, to + 1),
    focusedItemKey: nextItem.key,
    selectionAnchorKey: rangeStartKey,
  };
}
