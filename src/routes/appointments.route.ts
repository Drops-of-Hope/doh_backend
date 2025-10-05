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

// Get User appointments
router.get("/:userId", AppointmentsController.getUserAppointments);

// Get appointments by medical establishment ID
router.get("/medicalEstablishment/:medicalEstablishmentId", AppointmentsController.getAppointmentsByMedicalEstablishment);

// Update appointment status (e.g., confirm attendance)
router.post("/:appointmentId/status", AppointmentsController.updateAppointmentStatus);

export default router;
