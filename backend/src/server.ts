import { createServer } from "node:http";
import app from "./app.js";
import { API_URL, CORS_ORIGINS, HOST, PORT } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { setupWebSocketServer } from "./realtime/wsServer.js";

const server = createServer(app);
setupWebSocketServer(server);

server.listen(PORT, HOST, () => {
  console.log(`Сервер запущен на ${HOST}:${PORT}`);
  console.log(`API: ${API_URL}`);
  console.log(`Разрешённые origin: ${CORS_ORIGINS.join(", ")}`);
});

async function shutdown(signal: string) {
  console.log(`Получен сигнал ${signal}, завершаюсь`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
