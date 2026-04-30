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

export type ProjectInvitationNotificationItem = {
  id: string;
  type: "PROJECT_INVITATION";
  createdAt: string;
  readAt: string | null;
  invitation: ProjectInvitationNotification;
};

export type CollaborationActivityNotificationItem = {
  id: string;
  type: "COLLABORATION_ACTIVITY";
  createdAt: string;
  readAt: string | null;
  activity: {
    projectId: string;
    projectName: string;
    fileId: string;
    fileName: string;
    updatedAt: string;
    message: string;
  };
};

export type ServerNotificationItem = ProjectInvitationNotificationItem;
export type NotificationItem =
  | ServerNotificationItem
  | CollaborationActivityNotificationItem;

export type NotificationsState = {
  serverItems: ServerNotificationItem[];
  activityItems: CollaborationActivityNotificationItem[];
  status: AsyncStatus;
  error: import("../../lib/api/errorNormalization").ApiError | null;
};
