import { Router } from "express";
import { DonationReportsController } from "../controllers/donationReports.controller.js";

const router = Router();

// GET /donation-reports/stats
router.get("/stats", DonationReportsController.getStats);

export default router;
