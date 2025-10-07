//medicalEstablishments.route.ts
import { Router } from "express";
import { MedicalEstablishmentsController } from "../controllers/medicalEstablishments.controller.js";

const router = Router();

router.get("/", MedicalEstablishmentsController.getMedicalEstablishments); //Retrieve medical establishments by district.

//router.get('/appointments/:establishmentId/dates', MedicalEstablishmentsController.getDates); //Fetch the next 7 upcoming dates for a medical establishment.

router.get(
  "/appointments/:establishmentId/slots",
  MedicalEstablishmentsController.getSlots
); //Get available time slots for a specific date and establishment.


//route to get the inventory ID of medical establishment
router.get("/inventory/:establishmentId", MedicalEstablishmentsController.getInventory);

export default router;
