import express from "express";
import {
  createProjectLinkHandler,
  deleteProjectLinkHandler,
  getProjectLinks,
  updateProjectLinkSyncSummaryHandler,
} from "../controllers/projectLinksController.js";
import {
  projectLinkBodySchema,
  projectLinkParamsSchema,
  updateProjectLinkSyncSummaryBodySchema,
} from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getProjectLinks);
router.post("/", validateRequest({ body: projectLinkBodySchema }), createProjectLinkHandler);
router.delete(
  "/:id",
  validateRequest({ params: projectLinkParamsSchema }),
  deleteProjectLinkHandler,
);
router.put(
  "/:id/sync-summary",
  validateRequest({
    params: projectLinkParamsSchema,
    body: updateProjectLinkSyncSummaryBodySchema,
  }),
  updateProjectLinkSyncSummaryHandler,
);

export default router;
