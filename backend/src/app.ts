import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import authRouter from "./routes/auth.js";
import projectsRouter from "./routes/projects.js";
import filesRouter from "./routes/files.js";
import { API_URL, CORS_ORIGINS, PORT, WS_URL } from "./config.js";
import { setWss } from "./services/ws.js";

const app = express();

app.use(
  cors({
    // Разрешаем Vite и Electron без жесткой привязки к localhost в коде.
    origin(origin, callback) {
      if (!origin || origin === "null" || CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());

app.get("/ping", (_, res) => {
  res.send("pong");
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/files", filesRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

setWss(wss);

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "connected" }));
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`API: ${API_URL}`);
  console.log(`WebSocket: ${WS_URL}`);
  console.log(`Разрешенные origin: ${CORS_ORIGINS.join(", ")}`);
});
