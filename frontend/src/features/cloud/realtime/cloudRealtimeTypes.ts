export type CloudRealtimeTransportStatus = "offline" | "connecting" | "live" | "error";
export type CloudFileSyncStatus = CloudRealtimeTransportStatus | "syncing";

export type CloudRealtimeJoinedPayload = {
  fileId: string;
  version: number;
};

export type CloudRealtimeRemoteUpdatePayload = {
  fileId: string;
  content: string;
  version: number;
  updatedAt: string;
};

export type CloudRealtimeAckPayload = {
  fileId: string;
  version: number;
  updatedAt: string;
  acceptedContent: string | null;
};

export type CloudRealtimeErrorPayload = {
  code: string;
  message: string;
};

export type CloudRealtimeClientEvent =
  | {
      type: "status";
      payload: {
        status: CloudRealtimeTransportStatus;
      };
    }
  | {
      type: "joined";
      payload: CloudRealtimeJoinedPayload;
    }
  | {
      type: "remote_update";
      payload: CloudRealtimeRemoteUpdatePayload;
    }
  | {
      type: "ack";
      payload: CloudRealtimeAckPayload;
    }
  | {
      type: "ws_error";
      payload: CloudRealtimeErrorPayload;
    };
