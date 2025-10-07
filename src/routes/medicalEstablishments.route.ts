//medicalEstablishments.route.ts
import { Router } from "express";
import { MedicalEstablishmentsController } from "../controllers/medicalEstablishments.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

console.log('medical establishment route');

router.get("/", authenticateToken, MedicalEstablishmentsController.getMedicalEstablishments); //Retrieve medical establishments by district.

//router.get('/appointments/:establishmentId/dates', MedicalEstablishmentsController.getDates); //Fetch the next 7 upcoming dates for a medical establishment.

router.get(
  "/appointments/:establishmentId/slots",
  authenticateToken,
  MedicalEstablishmentsController.getSlots
); //Get available time slots for a specific date and establishment.

export default router;
