import express from "express";
import {
  acceptProjectInvitationHandler,
  declineProjectInvitationHandler,
} from "../controllers/projectInvitationsController.js";
import { invitationActionParamsSchema } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router();

router.use(requireAuth);

router.post(
  "/:id/accept",
  validateRequest({ params: invitationActionParamsSchema }),
  acceptProjectInvitationHandler,
);
router.post(
  "/:id/decline",
  validateRequest({ params: invitationActionParamsSchema }),
  declineProjectInvitationHandler,
);

export default router;
