import { resolveWsUrl } from "../../../config/api";
import type {
  CloudRealtimeAckPayload,
  CloudRealtimeClientEvent,
  CloudRealtimeErrorPayload,
  CloudRealtimeJoinedPayload,
  CloudRealtimeRemoteUpdatePayload,
  CloudRealtimeTransportStatus,
} from "./cloudRealtimeTypes";

type Listener = (event: CloudRealtimeClientEvent) => void;

type PendingAckWaiter = {
  sentContent: string;
  resolve: (payload: CloudRealtimeAckPayload) => void;
  reject: (error: Error) => void;
};

type ActiveRealtimeBridge = {
  fileId: string;
  flushPendingUpdate: () => Promise<boolean>;
  isRealtimeAvailable: () => boolean;
};

type ServerEnvelope =
  | {
      type: "joined_file_ack";
      payload: {
        fileId: string;
        version: number;
      };
    }
  | {
      type: "remote_update";
      payload: {
        fileId: string;
        content: string;
        version: number;
        updatedAt: string;
      };
    }
  | {
      type: "content_update_ack";
      payload: {
        fileId: string;
        version: number;
        updatedAt: string;
      };
    }
  | {
      type: "ws_error";
      payload: CloudRealtimeErrorPayload;
    };

let activeRealtimeBridge: ActiveRealtimeBridge | null = null;

function parseServerEnvelope(value: string): ServerEnvelope | null {
  try {
    const parsed = JSON.parse(value) as Partial<ServerEnvelope>;

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.type === "string" &&
      "payload" in parsed &&
      parsed.payload
    ) {
      return parsed as ServerEnvelope;
    }

    return null;
  } catch {
    return null;
  }
}

class CloudRealtimeClient {
  private socket: WebSocket | null = null;
  private desiredFileId: string | null = null;
  private joinedFileId: string | null = null;
  private reconnectTimer: number | null = null;
  private status: CloudRealtimeTransportStatus = "offline";
  private readonly listeners = new Set<Listener>();
  private readonly pendingAcks = new Map<string, PendingAckWaiter[]>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener({
      type: "status",
      payload: {
        status: this.status,
      },
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  setActiveFile(fileId: string | null) {
    const previousFileId = this.desiredFileId;
    this.desiredFileId = fileId;

    if (!fileId) {
      if (previousFileId && this.isSocketOpen()) {
        this.sendMessage({
          type: "leave_file",
          payload: {
            fileId: previousFileId,
          },
        });
      }

      this.joinedFileId = null;
      this.clearReconnectTimer();
      this.closeSocket();
      this.setStatus("offline");
      return;
    }

    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.openSocket();
      return;
    }

    if (this.socket.readyState === WebSocket.CONNECTING) {
      this.setStatus("connecting");
      return;
    }

    if (previousFileId && previousFileId !== fileId) {
      this.sendMessage({
        type: "leave_file",
        payload: {
          fileId: previousFileId,
        },
      });
    }

    this.joinedFileId = null;
    this.setStatus("connecting");
    this.sendJoin(fileId);
  }

  isLiveForFile(fileId: string) {
    return this.isSocketOpen() && this.joinedFileId === fileId && this.status === "live";
  }

  getStatus() {
    return this.status;
  }

  async sendContentUpdate(payload: {
    fileId: string;
    content: string;
    baseVersion?: number;
  }) {
    if (!this.isLiveForFile(payload.fileId)) {
      throw new Error("Realtime-соединение для файла недоступно");
    }

    return new Promise<CloudRealtimeAckPayload>((resolve, reject) => {
      const waiters = this.pendingAcks.get(payload.fileId) ?? [];

      waiters.push({
        sentContent: payload.content,
        resolve,
        reject,
      });

      this.pendingAcks.set(payload.fileId, waiters);

      try {
        this.sendMessage({
          type: "content_update",
          payload,
        });
      } catch (error) {
        this.shiftPendingAck(payload.fileId);
        reject(error instanceof Error ? error : new Error("Не удалось отправить обновление"));
      }
    });
  }

  private emit(event: CloudRealtimeClientEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private setStatus(status: CloudRealtimeTransportStatus) {
    if (this.status === status) {
      return;
    }

    this.status = status;
    this.emit({
      type: "status",
      payload: {
        status,
      },
    });
  }

  private openSocket() {
    this.clearReconnectTimer();
    this.closeSocket();

    this.setStatus("connecting");
    this.socket = new WebSocket(resolveWsUrl("/ws"));

    this.socket.addEventListener("open", () => {
      if (!this.desiredFileId) {
        this.setStatus("offline");
        return;
      }

      this.setStatus("connecting");
      this.sendJoin(this.desiredFileId);
    });

    this.socket.addEventListener("message", (event) => {
      this.handleMessage(String(event.data));
    });

    this.socket.addEventListener("error", () => {
      this.setStatus("error");
    });

    this.socket.addEventListener("close", () => {
      this.joinedFileId = null;
      this.socket = null;
      this.rejectAllPendingAcks("Realtime-соединение закрыто");

      if (this.desiredFileId) {
        this.setStatus("offline");
        this.scheduleReconnect();
        return;
      }

      this.setStatus("offline");
    });
  }

  private closeSocket() {
    if (!this.socket) {
      return;
    }

    const activeSocket = this.socket;
    this.socket = null;
    activeSocket.close();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null || !this.desiredFileId) {
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;

      if (!this.desiredFileId) {
        return;
      }

      this.openSocket();
    }, 1500);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer === null) {
      return;
    }

    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private sendJoin(fileId: string) {
    this.sendMessage({
      type: "join_file",
      payload: {
        fileId,
      },
    });
  }

  private isSocketOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private sendMessage(message: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket пока не подключен");
    }

    this.socket.send(JSON.stringify(message));
  }

  private handleMessage(rawMessage: string) {
    const envelope = parseServerEnvelope(rawMessage);

    if (!envelope) {
      return;
    }

    switch (envelope.type) {
      case "joined_file_ack":
        this.handleJoined(envelope.payload);
        return;
      case "remote_update":
        this.handleRemoteUpdate(envelope.payload);
        return;
      case "content_update_ack":
        this.handleAck(envelope.payload);
        return;
      case "ws_error":
        this.handleWsError(envelope.payload);
        return;
    }
  }

  private handleJoined(payload: CloudRealtimeJoinedPayload) {
    if (this.desiredFileId === payload.fileId) {
      this.joinedFileId = payload.fileId;
      this.setStatus("live");
    }

    this.emit({
      type: "joined",
      payload,
    });
  }

  private handleRemoteUpdate(payload: CloudRealtimeRemoteUpdatePayload) {
    this.emit({
      type: "remote_update",
      payload,
    });
  }

  private handleAck(payload: Omit<CloudRealtimeAckPayload, "acceptedContent">) {
    const waiter = this.shiftPendingAck(payload.fileId);
    const eventPayload: CloudRealtimeAckPayload = {
      ...payload,
      acceptedContent: waiter?.sentContent ?? null,
    };

    if (this.desiredFileId === payload.fileId) {
      this.setStatus("live");
    }

    this.emit({
      type: "ack",
      payload: eventPayload,
    });

    waiter?.resolve(eventPayload);
  }

  private handleWsError(payload: CloudRealtimeErrorPayload) {
    this.setStatus("error");
    this.rejectAllPendingAcks(payload.message);
    this.emit({
      type: "ws_error",
      payload,
    });

    this.closeSocket();
  }

  private shiftPendingAck(fileId: string) {
    const waiters = this.pendingAcks.get(fileId);

    if (!waiters || waiters.length === 0) {
      return null;
    }

    const nextWaiter = waiters.shift() ?? null;

    if (waiters.length === 0) {
      this.pendingAcks.delete(fileId);
    } else {
      this.pendingAcks.set(fileId, waiters);
    }

    return nextWaiter;
  }

  private rejectAllPendingAcks(message: string) {
    for (const waiters of this.pendingAcks.values()) {
      for (const waiter of waiters) {
        waiter.reject(new Error(message));
      }
    }

    this.pendingAcks.clear();
  }
}

export const cloudRealtimeClient = new CloudRealtimeClient();

export function registerActiveCloudRealtimeBridge(bridge: ActiveRealtimeBridge | null) {
  activeRealtimeBridge = bridge;
}

export function flushActiveCloudRealtimeUpdate(fileId: string) {
  if (!activeRealtimeBridge || activeRealtimeBridge.fileId !== fileId) {
    return Promise.resolve(false);
  }

  return activeRealtimeBridge.flushPendingUpdate();
}

export function isCloudRealtimeHandlingFile(fileId: string) {
  return Boolean(
    activeRealtimeBridge &&
      activeRealtimeBridge.fileId === fileId &&
      activeRealtimeBridge.isRealtimeAvailable(),
  );
}

