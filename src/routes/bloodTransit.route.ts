import { Router } from "express";
import { BloodTransitController } from "../controllers/bloodTransit.controller.js";

const router = Router();

// GET /blood-bank/transit-requests?bloodBankId=... or ?hospitalId=...
router.get("/transit-requests", BloodTransitController.getTransitRequests);

export default router;
