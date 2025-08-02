// src/routes/index.ts
import { Router } from "express";
import dummyRoutes from "./dummy.routes";
import appointmentSlotsRoutes from "./appointmentSlots.route";
import medicalEstablishmentsRoutes from "./medicalEstablishments.route";

const router = Router();

router.use("/dummies", dummyRoutes);
router.use("/slots", appointmentSlotsRoutes);
router.use("/medical-establishments", medicalEstablishmentsRoutes);

export default router;
