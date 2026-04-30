import type WebSocket from "ws";

export type AuthenticatedWebSocket = WebSocket & {
  userId: string;
};

export class FileRoomRegistry {
  private readonly socketsByFileId = new Map<string, Set<AuthenticatedWebSocket>>();
  private readonly activeFileIdBySocket = new WeakMap<AuthenticatedWebSocket, string>();

  join(socket: AuthenticatedWebSocket, fileId: string) {
    this.leave(socket);

    const sockets = this.socketsByFileId.get(fileId) ?? new Set<AuthenticatedWebSocket>();
    sockets.add(socket);

    this.socketsByFileId.set(fileId, sockets);
    this.activeFileIdBySocket.set(socket, fileId);
  }

  leave(socket: AuthenticatedWebSocket, fileId?: string) {
    const activeFileId = this.activeFileIdBySocket.get(socket);

    if (!activeFileId) {
      return;
    }

    if (fileId && activeFileId !== fileId) {
      return;
    }

    const sockets = this.socketsByFileId.get(activeFileId);

    if (sockets) {
      sockets.delete(socket);

      if (sockets.size === 0) {
        this.socketsByFileId.delete(activeFileId);
      }
    }

    this.activeFileIdBySocket.delete(socket);
  }

  disconnect(socket: AuthenticatedWebSocket) {
    this.leave(socket);
  }

  getActiveFileId(socket: AuthenticatedWebSocket) {
    return this.activeFileIdBySocket.get(socket) ?? null;
  }

  broadcast(
    fileId: string,
    message: string,
    options: {
      excludeSocket?: AuthenticatedWebSocket;
    } = {},
  ) {
    const sockets = this.socketsByFileId.get(fileId);

    if (!sockets) {
      return;
    }

    for (const socket of sockets) {
      if (options.excludeSocket && socket === options.excludeSocket) {
        continue;
      }

      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }
}
