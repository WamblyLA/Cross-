import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FsNodeType } from "../../utils/path";

export type ExplorerActionType =
  | "create-file"
  | "create-folder"
  | "rename"
  | "delete"
  | "refresh"
  | "collapse-all";

type ExplorerIntent = {
  id: number;
  type: ExplorerActionType;
};

type WorkspaceState = {
  rootPath: string | null;
  selectedPath: string | null;
  selectedType: FsNodeType | null;
  searchQuery: string;
  explorerIntent: ExplorerIntent | null;
};

const initialState: WorkspaceState = {
  rootPath: null,
  selectedPath: null,
  selectedType: null,
  searchQuery: "",
  explorerIntent: null,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setRootPath(state, action: PayloadAction<string | null>) {
      state.rootPath = action.payload;
      state.selectedPath = action.payload;
      state.selectedType = action.payload ? "folder" : null;
      state.searchQuery = "";
      state.explorerIntent = null;
    },
    selectNode(
      state,
      action: PayloadAction<{
        path: string | null;
        nodeType: FsNodeType | null;
      }>,
    ) {
      state.selectedPath = action.payload.path;
      state.selectedType = action.payload.nodeType;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    requestExplorerAction(state, action: PayloadAction<ExplorerActionType>) {
      const nextId = (state.explorerIntent?.id ?? 0) + 1;
      state.explorerIntent = {
        id: nextId,
        type: action.payload,
      };
    },
    clearExplorerIntent(state, action: PayloadAction<number | undefined>) {
      if (!state.explorerIntent) {
        return;
      }

      if (action.payload !== undefined && state.explorerIntent.id !== action.payload) {
        return;
      }

      state.explorerIntent = null;
    },
  },
});

export const {
  setRootPath,
  selectNode,
  setSearchQuery,
  requestExplorerAction,
  clearExplorerIntent,
} =
  workspaceSlice.actions;

export default workspaceSlice.reducer;
