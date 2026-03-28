import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import filesReducer from "../features/files/filesSlice";
import workspaceReducer from "../features/workspace/workspaceSlice";
import runnerReducer from "../features/runner/runnerSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    files: filesReducer,
    workspace: workspaceReducer,
    runner: runnerReducer,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type StateType = RootState;
export type AppDispatch = typeof store.dispatch;
