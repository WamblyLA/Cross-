import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createApiError, type ApiError } from "../../lib/api/errorNormalization";
import { login, logout, register, restoreSession } from "../auth/authThunks";
import {
  acceptNotificationProjectInvitation,
  declineNotificationProjectInvitation,
  fetchNotifications,
} from "./notificationsThunks";
import type {
  CollaborationActivityNotificationItem,
  NotificationsState,
} from "./notificationsTypes";

const MAX_ACTIVITY_NOTIFICATIONS = 10;

const initialState: NotificationsState = {
  serverItems: [],
  activityItems: [],
  status: "idle",
  error: null,
};

function resolveError(error: ApiError | undefined, fallbackMessage: string) {
  return error ?? createApiError(fallbackMessage);
}

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addCollaborationActivityNotification(
      state,
      action: PayloadAction<CollaborationActivityNotificationItem>,
    ) {
      if (state.activityItems.some((item) => item.id === action.payload.id)) {
        return;
      }

      state.activityItems = [action.payload, ...state.activityItems].slice(
        0,
        MAX_ACTIVITY_NOTIFICATIONS,
      );
    },
    markCollaborationActivityNotificationsRead(state) {
      const readAt = new Date().toISOString();

      state.activityItems = state.activityItems.map((item) =>
        item.readAt ? item : { ...item, readAt },
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.serverItems = action.payload.notifications;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = "failed";
        state.error = resolveError(action.payload, "Не удалось загрузить уведомления.");
      })
      .addCase(acceptNotificationProjectInvitation.fulfilled, (state, action) => {
        state.serverItems = state.serverItems.filter(
          (item) => item.invitation.id !== action.payload.invitationId,
        );
      })
      .addCase(declineNotificationProjectInvitation.fulfilled, (state, action) => {
        state.serverItems = state.serverItems.filter(
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

export const {
  addCollaborationActivityNotification,
  markCollaborationActivityNotificationsRead,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
