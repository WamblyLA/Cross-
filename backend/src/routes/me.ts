import express from "express";
import { me, updateProfile } from "../controllers/authController.js";
import {
  getMySettings,
  updateMySettings,
} from "../controllers/settingsController.js";
import { updateProfileBodySchema, updateSettingsBodySchema } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", me);
router.put("/", validateRequest({ body: updateProfileBodySchema }), updateProfile);
router.get("/settings", getMySettings);
router.put("/settings", validateRequest({ body: updateSettingsBodySchema }), updateMySettings);

export default router;