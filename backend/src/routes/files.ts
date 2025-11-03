import { getFileContent, getElemsInFolder, saveFileChanges, createFilder, deleteFilder } from "../controllers/filesControler.ts";
import express from "express";
const router = express.Router()
router.get('/',getElemsInFolder)
router.get('/content', getFileContent)
router.post('/save', saveFileChanges)
router.post('/create', createFilder)
router.post('/remove', deleteFilder)
export default router;