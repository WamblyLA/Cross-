import express from "express";
import { createProject, getProjects } from "../controllers/projectsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, getProjects);
router.post("/", requireAuth, createProject);

export default router;