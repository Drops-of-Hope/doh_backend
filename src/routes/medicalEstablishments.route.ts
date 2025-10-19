//medicalEstablishments.route.ts
import { Router } from "express";
import { MedicalEstablishmentsController } from "../controllers/medicalEstablishments.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// Retrieve all medical establishments
router.get("/all", MedicalEstablishmentsController.getAllMedicalEstablishments);

// Retrieve medical establishments by district (query param ?district=...)
router.get("/", MedicalEstablishmentsController.getMedicalEstablishments);

//router.get('/appointments/:establishmentId/dates', MedicalEstablishmentsController.getDates); //Fetch the next 7 upcoming dates for a medical establishment.

router.get(
  "/appointments/:establishmentId/slots",
  authenticateToken,
  MedicalEstablishmentsController.getSlots
); //Get available time slots for a specific date and establishment.

//route to get the inventory ID of medical establishment
router.get(
  "/inventory/:establishmentId",
  MedicalEstablishmentsController.getInventory
);

export default router;
