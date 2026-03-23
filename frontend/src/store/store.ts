import { configureStore } from "@reduxjs/toolkit";
import filesReducer from "../features/files/filesSlice";
import workspaceReducer from "../features/workspace/workspaceSlice";
import runnerReducer from "../features/runner/runnerSlice";

const store = configureStore({
  reducer: {
    files: filesReducer,
    workspace: workspaceReducer,
    runner: runnerReducer,
  },
});

export default store;
export type StateType = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
