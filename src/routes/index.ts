// src/routes/index.ts
import { Router } from "express";
import dummyRoutes from "./dummy.routes.js";
import appointmentsRoutes from "./appointments.route.js";
import appointmentSlotsRoutes from "./appointmentSlots.route.js";
import medicalEstablishmentsRoutes from "./medicalEstablishments.route.js";
import userRoutes from "./user.routes.js";
import donationsRoutes from "./donations.route.js";
import authRoutes from "./auth.route.js";
import homeRoutes from "./home.route.js";
import campaignsRoutes from "./campaigns.route.js";
import emergenciesRoutes from "./emergencies.route.js";
import qrRoutes from "./qr.route.js";
import notificationRoutes from "./notification.route.js";
import donationFormRoutes from "./donationForm.route.js";

const router = Router();

// Authentication routes
router.use("/auth", authRoutes);

// User routes
router.use("/users", userRoutes);

// Appointment routes
router.use("/appointments", appointmentsRoutes);

// Appointment slots routes
router.use("/slots", appointmentSlotsRoutes);

// Medical establishments routes
router.use("/medical-establishments", medicalEstablishmentsRoutes);

// Donation routes
router.use("/donations", donationsRoutes);

// Home dashboard routes
router.use("/home", homeRoutes);

// Campaign routes
router.use("/campaigns", campaignsRoutes);

// Emergency routes
router.use("/emergencies", emergenciesRoutes);

// QR code routes
router.use("/qr", qrRoutes);

// Notification routes
router.use("/notifications", notificationRoutes);

// Dummy routes (for testing)
router.use("/dummies", dummyRoutes);

//donation form routes
router.use("/donation-forms", donationFormRoutes);

export default router;
