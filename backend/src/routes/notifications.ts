import express from "express";
import { getNotifications } from "../controllers/notificationsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getNotifications);

export default router;
