import { Router } from "express";
import { DonationsController } from "../controllers/donations.controller.js";

const router = Router();

router.post('/form', DonationsController.submitDonationForm);

// Retrieve a donation form by ID
router.get('/form/:id', DonationsController.getDonationFormById);

export default router;
