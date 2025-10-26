import {createSlice, type PayloadAction } from "@reduxjs/toolkit"
export interface OpenedFile {
    id: string;
    name: string;
    extencion?: string;
    content: string;
}
interface FilesNow {
    openedFiles: OpenedFile[];
    activeFileId: string | null;
}
const initialState: FilesNow = {
    openedFiles: [],
    activeFileId: null
}
const filesSlice = createSlice({
    name: "files",
    initialState,
    reducers: {
        openFile: (state, action: PayloadAction<OpenedFile>) => {
            const estar = state.openedFiles.find(f => f.id === action.payload.id);
            if (!estar) {
                state.openedFiles.push(action.payload);
            }
            state.activeFileId = action.payload.id;
        },
        setActiveFile: (state, action: PayloadAction<string>) => {
            state.activeFileId = action.payload;
        },
        updateFileContent : (
            state, 
            action: PayloadAction<{id: string; content: string}>
        ) => {
            const estar = state.openedFiles.find(f => f.id === action.payload.id);
            if (estar) {
                estar.content = action.payload.content;
            }
        },
        closeFile: (state, action: PayloadAction<string>) => {
            state.openedFiles = state.openedFiles.filter(f => f.id !== action.payload);
            if (state.activeFileId === action.payload) {
                state.activeFileId = state.openedFiles.length ? state.openedFiles[state.openedFiles.length - 1].id : null
            }
        }
    }
});
export const {openFile, closeFile, setActiveFile, updateFileContent} = filesSlice.actions;
export default filesSlice.reducer;