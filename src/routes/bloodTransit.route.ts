import { Router } from "express";
import { BloodTransitController } from "../controllers/bloodTransit.controller.js";

const router = Router();

// GET /blood-bank/transit-requests?bloodBankId=... or ?hospitalId=...
router.get("/transit-requests", BloodTransitController.getTransitRequests);

// POST /blood-bank/transits
router.post("/transits", BloodTransitController.createTransit);

export default router;
