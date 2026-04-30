import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createBugReport } from "../controllers/bugReportsController.js";
import {
  BUG_REPORT_RATE_LIMIT_MAX,
  BUG_REPORT_RATE_LIMIT_WINDOW_MS,
} from "../config.js";
import { bugReportBodySchema } from "../lib/validation.js";
import { optionalAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router();

const bugReportRateLimiter = rateLimit({
  windowMs: BUG_REPORT_RATE_LIMIT_WINDOW_MS,
  limit: BUG_REPORT_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: async (req) =>
    req.userId
      ? `bug-report:user:${req.userId}`
      : `bug-report:ip:${ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown")}`,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Слишком много сообщений об ошибке. Попробуйте позже.",
    },
  },
});

router.post("/", optionalAuth, bugReportRateLimiter, validateRequest({ body: bugReportBodySchema }), createBugReport);

export default router;
