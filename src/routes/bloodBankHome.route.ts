import { Router } from "express";
import { BloodBankHomeController } from "../controllers/bloodBankHome.controller.js";

const router = Router();

// GET /api/blood-bank-home/counts
router.get("/counts", BloodBankHomeController.getCounts);

// GET /api/blood-bank-home/blood-type-distribution
router.get(
  "/blood-type-distribution",
  BloodBankHomeController.getBloodTypeDistribution
);

// GET /api/blood-bank-home/donations-two-weeks
router.get(
  "/donations-two-weeks",
  BloodBankHomeController.getTwoWeekDonationsStats
);

export default router;
