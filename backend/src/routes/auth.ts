import express from "express";
import rateLimit from "express-rate-limit";
import {
  forgotPassword,
  login,
  logout,
  register,
  resendVerificationEmail,
  resetPassword,
  resetPasswordPage,
  verifyEmail,
  verifyEmailPage,
} from "../controllers/authController.js";
import {
  AUTH_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_MS,
} from "../config.js";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resendVerificationBodySchema,
  verifyEmailBodySchema,
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
      message: "Слишком много попыток авторизации. Попробуйте позже.",
    },
  },
});

router.post("/register", authRateLimiter, validateRequest({ body: registerBodySchema }), register);
router.post("/login", authRateLimiter, validateRequest({ body: loginBodySchema }), login);
router.get("/verify-email", authRateLimiter, verifyEmailPage);
router.post(
  "/verify-email",
  authRateLimiter,
  validateRequest({ body: verifyEmailBodySchema }),
  verifyEmail,
);
router.post(
  "/resend-verification",
  authRateLimiter,
  validateRequest({ body: resendVerificationBodySchema }),
  resendVerificationEmail,
);
router.post(
  "/forgot-password",
  authRateLimiter,
  validateRequest({ body: forgotPasswordBodySchema }),
  forgotPassword,
);
router.get("/reset-password", authRateLimiter, resetPasswordPage);
router.post("/reset-password", authRateLimiter, resetPassword);
router.post("/logout", logout);

export default router;
