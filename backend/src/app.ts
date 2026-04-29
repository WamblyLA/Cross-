import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { CORS_ORIGINS, IS_PROD, JSON_BODY_LIMIT } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.js";
import filesRouter from "./routes/files.js";
import foldersRouter from "./routes/folders.js";
import meRouter from "./routes/me.js";
import notificationsRouter from "./routes/notifications.js";
import projectInvitationActionsRouter from "./routes/projectInvitationActions.js";
import projectInvitationsRouter from "./routes/projectInvitations.js";
import projectLinksRouter from "./routes/projectLinks.js";
import projectMembersRouter from "./routes/projectMembers.js";
import projectsRouter from "./routes/projects.js";

const app = express();
const allowedOrigins = new Set(CORS_ORIGINS);
const corsOptions: cors.CorsOptions = {
  credentials: true,
  optionsSuccessStatus: 204,
  origin(origin, callback) {
    const isAllowed = !origin || allowedOrigins.has(origin);

    if (!isAllowed && !IS_PROD) {
      console.warn(`[cors] Blocked origin: ${origin}`);
    }

    callback(null, isAllowed);
  },
};

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false, limit: JSON_BODY_LIMIT }));
app.use(express.json({ limit: JSON_BODY_LIMIT }));

const healthHandler: express.RequestHandler = (_, res) => {
  res.json({ status: "ok" });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/project-invitations", projectInvitationActionsRouter);
app.use("/api/project-links", projectLinksRouter);
app.use("/api/projects/:projectId/invitations", projectInvitationsRouter);
app.use("/api/projects/:projectId/members", projectMembersRouter);
app.use("/api/projects/:projectId/files", filesRouter);
app.use("/api/projects/:projectId/folders", foldersRouter);
app.use("/api/projects", projectsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
