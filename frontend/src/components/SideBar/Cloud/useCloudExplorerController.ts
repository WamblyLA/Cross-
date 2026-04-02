import { useMemo } from "react";
import { buildCloudExplorerContextMenuSections } from "./cloudExplorerContextMenu";
import { useCloudExplorerCreateRename } from "./useCloudExplorerCreateRename";
import { useCloudExplorerDragAndDrop } from "./useCloudExplorerDragAndDrop";
import { useCloudExplorerInteractionEffects } from "./useCloudExplorerInteractionEffects";
import { useCloudExplorerState } from "./useCloudExplorerState";

export function useCloudExplorerController() {
  const state = useCloudExplorerState();
  const createRename = useCloudExplorerCreateRename(state);
  const dragAndDrop = useCloudExplorerDragAndDrop(state);
  const interaction = useCloudExplorerInteractionEffects(state, createRename);
  const contextMenuSections = useMemo(
    () => buildCloudExplorerContextMenuSections(state, createRename),
    [createRename, state],
  );

  return {
    ...state,
    ...createRename,
    ...dragAndDrop,
    ...interaction,
    contextMenuSections,
  };
}
