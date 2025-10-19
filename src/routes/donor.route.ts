import { Router } from "express";
import { DonorController } from "../controllers/donor.controller.js";

const router = Router();

// GET /api/donors/location-count - Get donor counts grouped by district
router.get("/location-count", DonorController.getDonorCountsByDistrict);

// GET /api/donors/counts - Get total donors, today's appointments, and this month's donations
router.get("/counts", DonorController.getSummaryCounts);

// GET /api/donors
router.get("/donors", DonorController.getDonors);

// GET /api/donors/daily-count?days=30
router.get("/donors/daily-count", DonorController.getDailyDonations);

export default router;
