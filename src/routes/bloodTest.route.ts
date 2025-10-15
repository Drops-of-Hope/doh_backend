import { Router } from "express";
import { BloodTestController } from "../controllers/bloodTest.controller";

const router = Router();

//route to get all blood units thats waiting to be tested for each medical establishment inventory
router.get("/:inventoryId", BloodTestController.findAll);

// Route to get blood unit info by blood unit ID
router.get("/unit/:bloodId", BloodTestController.findBloodUnit);

// Route to get the BloodTest record for a blood unit
router.get("/test/:bloodId", BloodTestController.getTestByBloodId);

//Route to test blood type
router.post("/type/:bloodId", BloodTestController.updateBloodType);

// Route to update syphilis test result for a blood unit
router.post("/syphilis/:bloodId", BloodTestController.updateSyphilisTest);

// Route to update HIV test result for a blood unit
router.post("/hiv/:bloodId", BloodTestController.updateHivTest);

// Route to update Hepatitis B and/or Hepatitis C test results for a blood unit
router.post("/hepatitis/:bloodId", BloodTestController.updateHepatitisTest);

// Route to update Malaria test result for a blood unit
router.post("/malaria/:bloodId", BloodTestController.updateMalariaTest);

// Route to update hemoglobin value and mark resultPending as false
router.post("/hemoglobin/:bloodId", BloodTestController.updateHemoglobin);

export default router;
