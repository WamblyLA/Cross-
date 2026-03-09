import express from "express";
import {
  getFileContent,
  getElemsInFolder,
  saveFileChanges,
  createFilder,
  deleteFilder
} from "../controllers/filesController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, getElemsInFolder);
router.get("/content", requireAuth, getFileContent);
router.post("/save", requireAuth, saveFileChanges);
router.post("/create", requireAuth, createFilder);
router.post("/remove", requireAuth, deleteFilder);

export default router;