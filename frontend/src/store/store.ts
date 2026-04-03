import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import cloudReducer from "../features/cloud/cloudSlice";
import filesReducer from "../features/files/filesSlice";
import panelReducer from "../features/panel/panelSlice";
import runReducer from "../features/run/runSlice";
import syncReducer from "../features/sync/syncSlice";
import terminalReducer from "../features/terminal/terminalSlice";
import visualSettingsReducer from "../features/visualSettings/visualSettingsSlice";
import workspaceReducer from "../features/workspace/workspaceSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    cloud: cloudReducer,
    files: filesReducer,
    panel: panelReducer,
    run: runReducer,
    sync: syncReducer,
    terminal: terminalReducer,
    visualSettings: visualSettingsReducer,
    workspace: workspaceReducer,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type StateType = RootState;
export type AppDispatch = typeof store.dispatch;
