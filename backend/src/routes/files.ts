import express from "express";
import {
  createFile,
  deleteProjectFile,
  getProjectFile,
  getProjectFiles,
  updateProjectFile,
} from "../controllers/filesController.js";
import {
  createFileBodySchema,
  fileParamsSchema,
  projectFilesParamsSchema,
  updateFileBodySchema,
} from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", validateRequest({ params: projectFilesParamsSchema }), getProjectFiles);
router.post(
  "/",
  validateRequest({
    params: projectFilesParamsSchema,
    body: createFileBodySchema,
  }),
  createFile,
);
router.get("/:id", validateRequest({ params: fileParamsSchema }), getProjectFile);
router.put(
  "/:id",
  validateRequest({
    params: fileParamsSchema,
    body: updateFileBodySchema,
  }),
  updateProjectFile,
);
router.delete("/:id", validateRequest({ params: fileParamsSchema }), deleteProjectFile);

export default router;
