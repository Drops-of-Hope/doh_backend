import { Router } from "express";
import { EmergenciesController } from "../controllers/emergencies.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// GET /emergencies
router.get("/", EmergenciesController.getEmergencies);

// POST /emergencies/:id/respond
router.post("/:id/respond", authenticateToken, EmergenciesController.respondToEmergency);

export default router;