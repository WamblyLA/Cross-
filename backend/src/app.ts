import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import {
  API_URL,
  CORS_ORIGINS,
  JSON_BODY_LIMIT,
  PORT,
} from "./config.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.js";
import filesRouter from "./routes/files.js";
import foldersRouter from "./routes/folders.js";
import meRouter from "./routes/me.js";
import projectsRouter from "./routes/projects.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      callback(null, !origin || CORS_ORIGINS.includes(origin));
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/projects/:projectId/files", filesRouter);
app.use("/api/projects/:projectId/folders", foldersRouter);
app.use("/api/projects", projectsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
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
