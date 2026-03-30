type MoveSelectionArgs = {
  visiblePaths: string[];
  selectedPaths: string[];
  focusedPath: string | null;
  anchorPath: string | null;
  direction: -1 | 1;
  extendSelection: boolean;
};

export function resolvePrimarySelectionPath(
  focusedPath: string | null,
  selectedPaths: string[],
) {
  if (focusedPath && selectedPaths.includes(focusedPath)) {
    return focusedPath;
  }

  return selectedPaths[0] ?? null;
}

export function buildRangeSelection(
  visiblePaths: string[],
  rangeStartPath: string,
  targetPath: string,
) {
  const startIndex = visiblePaths.indexOf(rangeStartPath);
  const endIndex = visiblePaths.indexOf(targetPath);

  if (startIndex < 0 || endIndex < 0) {
    return null;
  }

  const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

  return visiblePaths.slice(from, to + 1);
}

export function moveSelectionByOffset({
  visiblePaths,
  selectedPaths,
  focusedPath,
  anchorPath,
  direction,
  extendSelection,
}: MoveSelectionArgs) {
  if (visiblePaths.length === 0) {
    return null;
  }

  const currentPath = focusedPath ?? selectedPaths[0] ?? visiblePaths[0] ?? null;
  const currentIndex = currentPath ? Math.max(0, visiblePaths.indexOf(currentPath)) : 0;
  const nextIndex = Math.max(0, Math.min(visiblePaths.length - 1, currentIndex + direction));
  const nextPath = visiblePaths[nextIndex] ?? null;

  if (!nextPath) {
    return null;
  }

  if (!extendSelection) {
    return {
      selectedPaths: [nextPath],
      focusedPath: nextPath,
      anchorPath: nextPath,
    };
  }

  const rangeStartPath = anchorPath ?? focusedPath ?? nextPath;
  const nextSelectedPaths = buildRangeSelection(visiblePaths, rangeStartPath, nextPath);

  if (!nextSelectedPaths) {
    return null;
  }

  return {
    selectedPaths: nextSelectedPaths,
    focusedPath: nextPath,
    anchorPath: rangeStartPath,
  };
}

export function selectAllVisible(visiblePaths: string[]) {
  return {
    selectedPaths: visiblePaths,
    focusedPath: visiblePaths[0] ?? null,
    anchorPath: visiblePaths[0] ?? null,
  };
}
