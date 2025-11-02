import { getFileContent, getElemsInFolder } from "../controllers/filesControler.ts";
import express from "express";
const router = express.Router()
router.get('/',getElemsInFolder)
router.get('/content', getFileContent)
export default router;