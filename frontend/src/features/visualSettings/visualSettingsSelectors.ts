import type { StateType } from "../../store/store";

export const selectCurrentVisualSettings = (state: StateType) => state.visualSettings.current;
export const selectAccountVisualSettings = (state: StateType) => state.visualSettings.accountSettings;
export const selectVisualSettingsActionError = (state: StateType) => state.visualSettings.actionError;
export const selectVisualSettingsSyncPending = (state: StateType) => state.visualSettings.syncPending;
export const selectVisualSettingsLoadPending = (state: StateType) => state.visualSettings.loadPending;
