import { Router } from "express";
import { DonationFormController } from "../controllers/donationForm.controller";

const router = Router();

// Get donation form by Appointment ID
router.get("/appointment/:appointmentId", DonationFormController.findByAppointmentId);

export default router;
