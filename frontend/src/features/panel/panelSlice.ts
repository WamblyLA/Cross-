import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type BottomPanelTabId = "terminal" | "run";

type PanelState = {
  isVisible: boolean;
  activeTab: BottomPanelTabId;
  height: number;
};

const initialState: PanelState = {
  isVisible: false,
  activeTab: "terminal",
  height: 352,
};

const panelSlice = createSlice({
  name: "panel",
  initialState,
  reducers: {
    showBottomPanel(state, action: PayloadAction<BottomPanelTabId>) {
      state.isVisible = true;
      state.activeTab = action.payload;
    },
    hideBottomPanel(state) {
      state.isVisible = false;
    },
    activateBottomPanelTab(state, action: PayloadAction<BottomPanelTabId>) {
      state.activeTab = action.payload;
      state.isVisible = true;
    },
    toggleBottomPanelTab(state, action: PayloadAction<BottomPanelTabId>) {
      if (state.isVisible && state.activeTab === action.payload) {
        state.isVisible = false;
        return;
      }

      state.isVisible = true;
      state.activeTab = action.payload;
    },
    setBottomPanelHeight(state, action: PayloadAction<number>) {
      state.height = action.payload;
    },
  },
});

export const {
  showBottomPanel,
  hideBottomPanel,
  activateBottomPanelTab,
  toggleBottomPanelTab,
  setBottomPanelHeight,
} = panelSlice.actions;

export default panelSlice.reducer;
