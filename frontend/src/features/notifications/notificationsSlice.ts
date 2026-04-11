import { createSlice } from "@reduxjs/toolkit";
import { createApiError, type ApiError } from "../../lib/api/errorNormalization";
import { login, logout, register, restoreSession } from "../auth/authThunks";
import {
  acceptNotificationProjectInvitation,
  declineNotificationProjectInvitation,
  fetchNotifications,
} from "./notificationsThunks";
import type { NotificationsState } from "./notificationsTypes";

const initialState: NotificationsState = {
  items: [],
  status: "idle",
  error: null,
};

function resolveError(error: ApiError | undefined, fallbackMessage: string) {
  return error ?? createApiError(fallbackMessage);
}

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload.notifications;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = "failed";
        state.error = resolveError(action.payload, "Не удалось загрузить уведомления.");
      })
      .addCase(acceptNotificationProjectInvitation.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (item) => item.invitation.id !== action.payload.invitationId,
        );
      })
      .addCase(declineNotificationProjectInvitation.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (item) => item.invitation.id !== action.payload.invitationId,
        );
      })
      .addCase(restoreSession.fulfilled, () => initialState)
      .addCase(restoreSession.rejected, () => initialState)
      .addCase(login.fulfilled, () => initialState)
      .addCase(register.fulfilled, () => initialState)
      .addCase(logout.fulfilled, () => initialState);
  },
});

export default notificationsSlice.reducer;
