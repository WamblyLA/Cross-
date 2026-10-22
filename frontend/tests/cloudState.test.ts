import { describe, expect, test } from "bun:test";
import { createCloudSelectionEntry } from "../src/features/cloud/cloudSelection";
import {
  applyCloudSelection,
  createInitialCloudState,
  removeCloudSelectionKeys,
} from "../src/features/cloud/cloudState";

describe("cloud selection state", () => {
  test("keeps legacy selected fields aligned with the focused item", () => {
    const state = createInitialCloudState();
    const project = createCloudSelectionEntry({ itemType: "project", projectId: "project-1" });
    const file = createCloudSelectionEntry({
      itemType: "file",
      projectId: "project-1",
      fileId: "file-1",
      folderId: "folder-1",
      name: "main.py",
    });

    applyCloudSelection(state, [project, file], file.key, project.key);

    expect({
      selectedItemKeys: state.selectedItemKeys,
      focusedItemKey: state.focusedItemKey,
      selectionAnchorKey: state.selectionAnchorKey,
      selectedProjectId: state.selectedProjectId,
      selectedFolderId: state.selectedFolderId,
      selectedFileId: state.selectedFileId,
      selectedItemType: state.selectedItemType,
      selectedItemCount: state.selectedItemCount,
    }).toEqual({
      selectedItemKeys: [project.key, file.key],
      focusedItemKey: file.key,
      selectionAnchorKey: project.key,
      selectedProjectId: "project-1",
      selectedFolderId: null,
      selectedFileId: "file-1",
      selectedItemType: "file",
      selectedItemCount: 2,
    });
  });

  test("falls back to the remaining item when the focused item is removed", () => {
    const state = createInitialCloudState();
    const first = createCloudSelectionEntry({ itemType: "project", projectId: "project-1" });
    const second = createCloudSelectionEntry({ itemType: "project", projectId: "project-2" });
    applyCloudSelection(state, [first, second], second.key, second.key);

    removeCloudSelectionKeys(state, (entry) => entry.projectId === "project-2");

    expect(state.selectedItemKeys).toEqual([first.key]);
    expect(state.focusedItemKey).toBe(first.key);
    expect(state.selectionAnchorKey).toBe(first.key);
    expect(state.selectedProjectId).toBe("project-1");
  });
});
