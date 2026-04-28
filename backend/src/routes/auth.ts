import express from "express";
import rateLimit from "express-rate-limit";
import { login, logout, register } from "../controllers/authController.js";
import {
  AUTH_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_MS,
} from "../config.js";
import {
  loginBodySchema,
  registerBodySchema,
} from "../lib/validation.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router();

const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      message: "Слишком много попыток авторизации, попробуйте позже",
    },
  },
});

router.post("/register", authRateLimiter, validateRequest({ body: registerBodySchema }), register);
router.post("/login", authRateLimiter, validateRequest({ body: loginBodySchema }), login);
router.post("/logout", logout);

export default router;
