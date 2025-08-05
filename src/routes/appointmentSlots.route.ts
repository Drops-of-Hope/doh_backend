//appointmentSlots.route.ts
import { Router } from "express";
import { AppointmentSlotsController } from "../controllers/appointmentSlots.controller.js";

const router = Router();

router.post("/", AppointmentSlotsController.create);

router.get("/getSlots", AppointmentSlotsController.getAvailableSlots);

router.post("/createAppointments", AppointmentSlotsController.createAppointment); //Create an appointment.

export default router;
