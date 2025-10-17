import { Router } from "express";
import { EmergenciesController } from "../controllers/emergencies.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// GET /emergencies
router.get("/", EmergenciesController.getEmergencies);

// POST /emergencies - Create new emergency request
router.post("/", authenticateToken, EmergenciesController.createEmergency);

// GET /emergencies/by-requester/:requestedById
router.get("/by-requester/:requestedById", EmergenciesController.getEmergenciesByRequester);

// GET /emergencies/by-hospital/:hospitalId
router.get("/by-hospital/:hospitalId", EmergenciesController.getEmergenciesByHospital);

// POST /emergencies/:id/respond
router.post("/:id/respond", authenticateToken, EmergenciesController.respondToEmergency);

export default router;