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

// Route to update HIV test result for a blood unit
router.post("/hiv/:bloodId", BloodTestController.updateHivTest);

export default router;
