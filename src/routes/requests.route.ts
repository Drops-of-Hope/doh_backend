import { Router } from "express";
import { RequestController } from "../controllers/request.controller.js";

const router = Router();

// POST /requests
router.post("/requests", RequestController.createRequest);

export default router;

