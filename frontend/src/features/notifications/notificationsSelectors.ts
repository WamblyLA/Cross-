import type { StateType } from "../../store/store";

export const selectNotificationsState = (state: StateType) => state.notifications;
export const selectNotificationsItems = (state: StateType) => state.notifications.items;
export const selectNotificationsStatus = (state: StateType) => state.notifications.status;
export const selectNotificationsError = (state: StateType) => state.notifications.error;
export const selectNotificationsCount = (state: StateType) => state.notifications.items.length;
