import type { StateType } from "../../store/store";

export const selectNotificationsItems = (state: StateType) =>
  [...state.notifications.activityItems, ...state.notifications.serverItems].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

export const selectNotificationsStatus = (state: StateType) => state.notifications.status;
export const selectNotificationsError = (state: StateType) => state.notifications.error;
export const selectNotificationsCount = (state: StateType) =>
  state.notifications.activityItems.filter((item) => item.readAt === null).length +
  state.notifications.serverItems.length;
