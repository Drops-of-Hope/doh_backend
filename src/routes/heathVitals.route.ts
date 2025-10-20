import { Router } from "express";
import { HealthVitalsController } from "../controllers/healthVitals.controller.js";

const router = Router();

router.post("/", HealthVitalsController.create);
router.get(
  "/appointment/:appointmentId",
  HealthVitalsController.getByAppointmentId
);
router.get("/user/:userId", HealthVitalsController.getByUserId);

export default router;
