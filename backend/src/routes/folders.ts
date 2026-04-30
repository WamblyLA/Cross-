import express from "express";
import {
  createFolder,
  deleteFolder,
  moveFolder,
  updateFolder,
} from "../controllers/foldersController.js";
import {
  createFolderBodySchema,
  folderParamsSchema,
  moveFolderBodySchema,
  projectFilesParamsSchema,
  updateFolderBodySchema,
} from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  validateRequest({
    params: projectFilesParamsSchema,
    body: createFolderBodySchema,
  }),
  createFolder,
);
router.put(
  "/:id",
  validateRequest({
    params: folderParamsSchema,
    body: updateFolderBodySchema,
  }),
  updateFolder,
);
router.post(
  "/:id/move",
  validateRequest({
    params: folderParamsSchema,
    body: moveFolderBodySchema,
  }),
  moveFolder,
);
router.delete("/:id", validateRequest({ params: folderParamsSchema }), deleteFolder);

export default router;
