import { Router } from "express";
import { BloodController } from "../controllers/blood.controller.js";

const router = Router();

// POST /api/blood/check-availability
router.post("/check-availability", BloodController.checkAvailability);

// POST /api/blood/list-units
router.post("/list-units", BloodController.listAvailableUnits);

// POST /api/blood/expired-units
router.post("/expired-units", BloodController.listExpiredUnits);

export default router;
