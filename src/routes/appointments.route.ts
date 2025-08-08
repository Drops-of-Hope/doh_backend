//appointments.route.ts
import { Router } from "express";
import { AppointmentsController } from "../controllers/appointments.controller.js";

const router = Router();

// Create new appointment
router.post("/createAppointments", (req, res, next) => {
  console.log("POST /createAppointments hit");
  next();
}, AppointmentsController.createAppointment);

// Get appointment by ID
router.get("/:appointmentId", AppointmentsController.getAppointment);

export default router;
