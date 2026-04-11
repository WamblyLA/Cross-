import type { AsyncStatus } from "../cloud/cloudTypes";

export type ProjectInvitationNotification = {
  id: string;
  projectId: string;
  projectName: string;
  inviterUserId: string;
  inviterUsername: string;
  inviterEmail: string;
  role: "editor" | "viewer";
  status: "pending";
  createdAt: string;
  updatedAt: string;
};

export type NotificationItem = {
  id: string;
  type: "PROJECT_INVITATION";
  createdAt: string;
  readAt: string | null;
  invitation: ProjectInvitationNotification;
};

export type NotificationsState = {
  items: NotificationItem[];
  status: AsyncStatus;
  error: import("../../lib/api/errorNormalization").ApiError | null;
};
