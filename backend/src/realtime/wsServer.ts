import { Buffer } from "node:buffer";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { createCloudFileRealtimeHandler } from "./cloudFileRealtimeHandler.js";
import { FileRoomRegistry, type AuthenticatedWebSocket } from "./fileRoomRegistry.js";
import { authenticateWebSocketRequest } from "./wsAuth.js";

function writeUpgradeError(socket: Duplex, statusCode: number, message: string) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\n` +
      "Connection: close\r\n" +
      "Content-Type: text/plain; charset=utf-8\r\n" +
      `Content-Length: ${Buffer.byteLength(message, "utf8")}\r\n` +
      "\r\n" +
      message,
  );
  socket.destroy();
}

function getRequestPath(request: IncomingMessage) {
  return new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`).pathname;
}

export function setupWebSocketServer(server: HttpServer) {
  const websocketServer = new WebSocketServer({ noServer: true });
  const registry = new FileRoomRegistry();
  const handler = createCloudFileRealtimeHandler(registry);

  server.on("upgrade", (request, socket, head) => {
    if (getRequestPath(request) !== "/ws") {
      socket.destroy();
      return;
    }

    let auth;

    try {
      auth = authenticateWebSocketRequest(request);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "Не удалось авторизоваться (ws)";
      writeUpgradeError(socket, 401, message);
      return;
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      const authenticatedSocket = websocket as AuthenticatedWebSocket;
      authenticatedSocket.userId = auth.userId;

      websocketServer.emit("connection", authenticatedSocket, request);
    });
  });

  websocketServer.on("connection", (socket) => {
    handler.attach(socket as AuthenticatedWebSocket);
  });

  return websocketServer;
}
