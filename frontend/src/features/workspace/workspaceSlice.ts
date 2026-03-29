import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { WorkspaceSource } from "../cloud/cloudTypes";
import type { FsNodeType } from "../../utils/path";

export type ExplorerActionType =
  | "create-file"
  | "create-folder"
  | "create-project"
  | "rename"
  | "delete"
  | "refresh"
  | "collapse-all";

type ExplorerIntent = {
  id: number;
  type: ExplorerActionType;
};

type WorkspaceState = {
  source: WorkspaceSource;
  rootPath: string | null;
  selectedPath: string | null;
  selectedType: FsNodeType | null;
  selectionCount: number;
  searchQuery: string;
  explorerIntent: ExplorerIntent | null;
};

const initialState: WorkspaceState = {
  source: "local",
  rootPath: null,
  selectedPath: null,
  selectedType: null,
  selectionCount: 0,
  searchQuery: "",
  explorerIntent: null,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaceSource(state, action: PayloadAction<WorkspaceSource>) {
      state.source = action.payload;
      state.explorerIntent = null;
    },
    setRootPath(state, action: PayloadAction<string | null>) {
      state.source = "local";
      state.rootPath = action.payload;
      state.selectedPath = null;
      state.selectedType = null;
      state.selectionCount = 0;
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
      state.selectionCount = action.payload.path ? 1 : 0;
    },
    setExplorerSelectionSummary(
      state,
      action: PayloadAction<{
        path: string | null;
        nodeType: FsNodeType | null;
        count: number;
      }>,
    ) {
      state.selectedPath = action.payload.path;
      state.selectedType = action.payload.nodeType;
      state.selectionCount = action.payload.count;
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
  setWorkspaceSource,
  setRootPath,
  selectNode,
  setExplorerSelectionSummary,
  setSearchQuery,
  requestExplorerAction,
  clearExplorerIntent,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
