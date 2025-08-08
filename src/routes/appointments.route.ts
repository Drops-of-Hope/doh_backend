import { Router } from "express";
import { AppointmentsController } from "../controllers/appointments.controller.js";

const router = Router();

// Create new appointment
router.post(
  "/createAppointments",
  (req, res, next) => {
    console.log("POST /createAppointments hit");
    next();
  },
  AppointmentsController.createAppointment
);

// Get appointment by ID
router.get("/:appointmentId", AppointmentsController.getAppointment);

// Get appointments by medical establishment ID
router.get("/medicalEstablishment/:medicalEstablishmentId", AppointmentsController.getAppointmentsByMedicalEstablishment);

export default router;
