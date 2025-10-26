import { configureStore } from "@reduxjs/toolkit";
import filesReducer from '../features/files/filesSlice';
const store = configureStore({
    reducer: {
        files: filesReducer
    }
});
export default store;
export type StateType = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;