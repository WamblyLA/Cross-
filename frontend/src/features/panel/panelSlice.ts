import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type BottomPanelTabId = "terminal" | "run";

type PanelState = {
  isVisible: boolean;
  activeTab: BottomPanelTabId;
};

const initialState: PanelState = {
  isVisible: false,
  activeTab: "terminal",
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
  },
});

export const {
  showBottomPanel,
  hideBottomPanel,
  activateBottomPanelTab,
  toggleBottomPanelTab,
} = panelSlice.actions;

export default panelSlice.reducer;
