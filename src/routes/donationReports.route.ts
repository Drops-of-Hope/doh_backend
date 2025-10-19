import { Router } from "express";
import { DonationReportsController } from "../controllers/donationReports.controller.js";

const router = Router();

// GET /donation-reports/stats
router.get("/stats", DonationReportsController.getStats);

// GET /donation-reports/donors/stats
router.get("/donors/stats", DonationReportsController.getDonorStats);

// GET /donation-reports/donors/inactive
router.get("/donors/inactive", DonationReportsController.getInactiveDonors);

export default router;
