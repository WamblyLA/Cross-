import { getFileContent, getElemsInFolder, saveFileChanges } from "../controllers/filesControler.ts";
import express from "express";
const router = express.Router()
router.get('/',getElemsInFolder)
router.get('/content', getFileContent)
router.post('/save', saveFileChanges)
export default router;