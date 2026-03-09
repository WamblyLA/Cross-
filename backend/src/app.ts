import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer } from "ws";
import filesRouter from "./routes/files.js";
import { setWss } from "./services/ws.js"

const app = express();

app.use(cors());
app.use(express.json());

app.get("/ping", (_, res) => {
  res.send("pong");
});

app.use("/api/files", filesRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

setWss(wss);

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "connected" }));
});

const port = Number(process.env.PORT || 3000);

server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});