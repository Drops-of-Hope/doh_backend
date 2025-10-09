import { Router } from "express";
import { BloodController } from "../controllers/blood.controller.js";

const router = Router();

// POST /api/blood/check-availability
router.post("/check-availability", BloodController.checkAvailability);

export default router;
