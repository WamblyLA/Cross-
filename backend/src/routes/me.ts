import express from "express";
import { me } from "../controllers/authController.js";
import {
  getMySettings,
  updateMySettings,
} from "../controllers/settingsController.js";
import { updateSettingsBodySchema } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", me);
router.get("/settings", getMySettings);
router.put("/settings", validateRequest({ body: updateSettingsBodySchema }), updateMySettings);

export default router;
