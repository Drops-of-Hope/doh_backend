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
import eligibilityRoutes from "./eligibility.route.js";
import healthVitalsRoutes from './heathVitals.route.js';
import bloodDonationRoutes from './bloodDonation.route.js';
import bloodRoutes from './blood.routes.js';
import activitiesRoutes from "./activities.route.js";
import bloodTestRoutes from "./bloodTest.route.js";
import devicesRoutes from "./devices.route.js";
import donorRoutes from "./donor.route.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { SSE } from "../utils/sse.js";
import bloodTransitRoutes from "./bloodTransit.route.js";

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

// Activities routes
router.use("/activities", activitiesRoutes);

// Dummy routes (for testing)
router.use("/dummies", dummyRoutes);

//donation form routes
router.use("/donation-forms", donationFormRoutes);

//route to update availability in case of risk factors in blood donation form
router.use("/eligibility", eligibilityRoutes);

//route to add health info for each donation (eg- weight, bp)
router.use("/health-vitals", healthVitalsRoutes);

//route to add blood, donation info when a donor donates blood
router.use("/blood-donation", bloodDonationRoutes);

//route to handle blood testings
router.use("/blood-test", bloodTestRoutes);

// blood availability and related routes
router.use("/blood", bloodRoutes);

// Device routes (push token registration)
router.use("/devices", devicesRoutes);

// Donor routes
router.use("/", donorRoutes);

// Blood Transit routes
router.use("/blood-bank", bloodTransitRoutes);

// SSE stream for authenticated user
router.get('/sse', authenticateToken, (req: AuthenticatedRequest, res) => {
	const userId = req.user?.id;
	if (!userId) {
		res.status(401).end();
		return;
	}
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
	});
	// Initial ping
	res.write(`event: ping\ndata: {"ok":true}\n\n`);
	SSE.subscribe(userId, res);
});

export default router;