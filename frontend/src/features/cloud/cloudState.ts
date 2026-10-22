import {
  dedupeCloudSelectionEntries,
  parseCloudSelectionKey,
  type CloudSelectionEntry,
} from "./cloudSelection";
import type { CloudProjectsState } from "./cloudTypes";

export function createInitialCloudState(): CloudProjectsState {
  return {
    projects: [],
    projectsStatus: "idle",
    projectsError: null,
    activeProjectId: null,
    selectedItemKeys: [],
    focusedItemKey: null,
    selectionAnchorKey: null,
    selectedProjectId: null,
    selectedFolderId: null,
    selectedFileId: null,
    selectedItemType: null,
    selectedItemCount: 0,
    filesByProjectId: {},
    treeByProjectId: {},
    filesStatusByProjectId: {},
    filesErrorByProjectId: {},
    projectActionPending: null,
    projectActionTargetId: null,
    projectActionError: null,
    folderActionPending: null,
    folderActionTargetId: null,
    folderActionError: null,
    fileActionPending: null,
    fileActionTargetId: null,
    fileActionError: null,
  };
}

export const initialCloudState = createInitialCloudState();

function syncLegacySelectionState(
  state: CloudProjectsState,
  selection: CloudSelectionEntry[],
  focusedItemKey: string | null,
) {
  const primarySelection =
    (focusedItemKey ? selection.find((entry) => entry.key === focusedItemKey) : null) ??
    selection[0] ??
    null;

  state.selectedProjectId = primarySelection?.projectId ?? null;
  state.selectedFolderId = primarySelection?.itemType === "folder" ? primarySelection.folderId : null;
  state.selectedFileId = primarySelection?.itemType === "file" ? primarySelection.fileId : null;
  state.selectedItemType = primarySelection?.itemType ?? null;
  state.selectedItemCount = selection.length;
}

export function applyCloudSelection(
  state: CloudProjectsState,
  items: CloudSelectionEntry[],
  focusedItemKey?: string | null,
  selectionAnchorKey?: string | null,
) {
  const nextItems = dedupeCloudSelectionEntries(items);
  const nextKeys = nextItems.map((entry) => entry.key);
  const resolvedFocusedKey =
    focusedItemKey && nextKeys.includes(focusedItemKey) ? focusedItemKey : nextKeys[0] ?? null;
  const resolvedAnchorKey =
    selectionAnchorKey && nextKeys.includes(selectionAnchorKey)
      ? selectionAnchorKey
      : resolvedFocusedKey;

  state.selectedItemKeys = nextKeys;
  state.focusedItemKey = resolvedFocusedKey;
  state.selectionAnchorKey = resolvedAnchorKey;
  syncLegacySelectionState(state, nextItems, resolvedFocusedKey);
}

export function clearCloudSelectionState(state: CloudProjectsState) {
  state.selectedItemKeys = [];
  state.focusedItemKey = null;
  state.selectionAnchorKey = null;
  state.selectedProjectId = null;
  state.selectedFolderId = null;
  state.selectedFileId = null;
  state.selectedItemType = null;
  state.selectedItemCount = 0;
}

export function removeCloudSelectionKeys(
  state: CloudProjectsState,
  predicate: (entry: CloudSelectionEntry) => boolean,
) {
  const remainingEntries = state.selectedItemKeys
    .map((key) => parseCloudSelectionKey(key))
    .filter((entry): entry is CloudSelectionEntry => Boolean(entry))
    .filter((entry) => !predicate(entry));

  applyCloudSelection(
    state,
    remainingEntries,
    remainingEntries.some((entry) => entry.key === state.focusedItemKey)
      ? state.focusedItemKey
      : remainingEntries[0]?.key ?? null,
    remainingEntries.some((entry) => entry.key === state.selectionAnchorKey)
      ? state.selectionAnchorKey
      : remainingEntries[0]?.key ?? null,
  );
}
