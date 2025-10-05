import { Router } from "express";
import { AppointmentsController } from "../controllers/appointments.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// Get authenticated user's appointments (protected route)
router.get("/user", authenticateToken, AppointmentsController.getAuthenticatedUserAppointments);

// Create new appointment (protected route)
router.post("/create", authenticateToken, AppointmentsController.createAuthenticatedAppointment);

// Update/reschedule appointment (protected route)
router.put("/:id", authenticateToken, AppointmentsController.updateAppointment);

// Cancel appointment (protected route)
router.delete("/:id", authenticateToken, AppointmentsController.deleteAppointment);

// Create new appointment (legacy)
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

// Get User appointments (legacy - potential conflict with appointmentId route)
// router.get("/:userId", AppointmentsController.getUserAppointments);

// Get appointments by medical establishment ID
router.get("/medicalEstablishment/:medicalEstablishmentId", AppointmentsController.getAppointmentsByMedicalEstablishment);

export default router;
