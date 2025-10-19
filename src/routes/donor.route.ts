import { Router } from "express";
import { DonorController } from "../controllers/donor.controller.js";

const router = Router();

// GET /api/donors
router.get("/donors", DonorController.getDonors);

// GET /api/donors/daily-count?days=30
router.get("/donors/daily-count", DonorController.getDailyDonations);

export default router;
