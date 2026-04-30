import express from "express";
import {
  deleteProjectMember,
  getProjectMembers,
  updateProjectMember,
} from "../controllers/projectMembersController.js";
import {
  projectFilesParamsSchema,
  projectMemberParamsSchema,
  updateProjectMemberBodySchema,
} from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", validateRequest({ params: projectFilesParamsSchema }), getProjectMembers);
router.patch(
  "/:id",
  validateRequest({
    params: projectMemberParamsSchema,
    body: updateProjectMemberBodySchema,
  }),
  updateProjectMember,
);
router.delete("/:id", validateRequest({ params: projectMemberParamsSchema }), deleteProjectMember);

export default router;
