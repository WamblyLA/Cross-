import express from "express";
import {
  createProjectInvitationHandler,
  revokeProjectInvitationHandler,
} from "../controllers/projectInvitationsController.js";
import {
  createProjectInvitationBodySchema,
  projectFilesParamsSchema,
  projectInvitationParamsSchema,
} from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  validateRequest({
    params: projectFilesParamsSchema,
    body: createProjectInvitationBodySchema,
  }),
  createProjectInvitationHandler,
);
router.delete(
  "/:id",
  validateRequest({ params: projectInvitationParamsSchema }),
  revokeProjectInvitationHandler,
);

export default router;
