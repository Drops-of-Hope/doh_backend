import { Router } from "express";
import { DonationsController } from "../controllers/donations.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// Submit blood donation form (protected route)
router.post('/form', authenticateToken, DonationsController.submitAuthenticatedDonationForm);

// Get user's donation history (protected route)
router.get('/history', authenticateToken, DonationsController.getDonationHistory);

// Retrieve a donation form by ID
router.get('/form/:id', DonationsController.getDonationFormById);

export default router;
