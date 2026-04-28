import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeApiError, type ApiError } from "../../lib/api/errorNormalization";
import type { StateType } from "../../store/store";
import { fetchProjects } from "../cloud/cloudThunks";
import * as cloudApi from "../cloud/cloudApi";
import type { ServerNotificationItem } from "./notificationsTypes";

type NotificationsThunkConfig = {
  state: StateType;
  rejectValue: ApiError;
};

export const fetchNotifications = createAsyncThunk<
  { notifications: ServerNotificationItem[] },
  void,
  NotificationsThunkConfig
>("notifications/fetchNotifications", async (_, { rejectWithValue }) => {
  try {
    return await cloudApi.listNotifications();
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const acceptNotificationProjectInvitation = createAsyncThunk<
  { invitationId: string; projectId: string },
  { invitationId: string },
  NotificationsThunkConfig
>("notifications/acceptProjectInvitation", async ({ invitationId }, { dispatch, rejectWithValue }) => {
  try {
    const response = await cloudApi.acceptProjectInvitation(invitationId);
    void dispatch(fetchNotifications());
    void dispatch(fetchProjects());
    return response;
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const declineNotificationProjectInvitation = createAsyncThunk<
  { invitationId: string; projectId: string },
  { invitationId: string },
  NotificationsThunkConfig
>("notifications/declineProjectInvitation", async ({ invitationId }, { dispatch, rejectWithValue }) => {
  try {
    const response = await cloudApi.declineProjectInvitation(invitationId);
    void dispatch(fetchNotifications());
    return response;
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});
