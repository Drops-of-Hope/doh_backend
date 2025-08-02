//appointmentSlots.route.ts
import { Router } from "express";
import { AppointmentSlotsController } from "../controllers/appointmentSlots.controller";

const router = Router();

router.post("/", AppointmentSlotsController.create);

router.post("/appointments", AppointmentSlotsController.createAppointment); //Create an appointment.

export default router;
