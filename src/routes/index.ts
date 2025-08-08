// src/routes/index.ts
import { Router } from "express";
import dummyRoutes from "./dummy.routes.js";
import appointmentsRoutes from "./appointments.route.js";
import appointmentSlotsRoutes from "./appointmentSlots.route.js";
import medicalEstablishmentsRoutes from "./medicalEstablishments.route.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.use("/dummies", dummyRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/slots", appointmentSlotsRoutes);
router.use("/medical-establishments", medicalEstablishmentsRoutes);
router.use("/users", userRoutes);

export default router;
