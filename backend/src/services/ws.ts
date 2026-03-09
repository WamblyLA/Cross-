import { WebSocketServer } from "ws";

let wss: WebSocketServer | null = null;

export function setWss(server: WebSocketServer) {
  wss = server;
}

export function broadcast(data: unknown) {
  if (!wss) return;

  const payload = JSON.stringify(data);

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  });
}
