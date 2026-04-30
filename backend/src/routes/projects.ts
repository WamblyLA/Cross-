import express from "express";
import {
  createProject,
  deleteProject,
  getProject,
  getProjectRunSnapshot,
  getProjectSyncManifest,
  getProjects,
  getProjectTree,
  updateProject,
} from "../controllers/projectsController.js";
import {
  createProjectBodySchema,
  projectParamsSchema,
  updateProjectBodySchema,
} from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getProjects);
router.post("/", validateRequest({ body: createProjectBodySchema }), createProject);
router.get("/:id", validateRequest({ params: projectParamsSchema }), getProject);
router.get("/:id/tree", validateRequest({ params: projectParamsSchema }), getProjectTree);
router.get(
  "/:id/sync-manifest",
  validateRequest({ params: projectParamsSchema }),
  getProjectSyncManifest,
);
router.get(
  "/:id/run-snapshot",
  validateRequest({ params: projectParamsSchema }),
  getProjectRunSnapshot,
);
router.put(
  "/:id",
  validateRequest({
    params: projectParamsSchema,
    body: updateProjectBodySchema,
  }),
  updateProject,
);
router.delete("/:id", validateRequest({ params: projectParamsSchema }), deleteProject);

export default router;
