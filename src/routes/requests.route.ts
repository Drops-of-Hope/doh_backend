import { Router } from "express";
import { RequestController } from "../controllers/request.controller.js";

const router = Router();

// POST /
router.post("/", RequestController.createRequest);

export default router;

