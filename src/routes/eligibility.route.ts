import { Router } from "express";
import { EligibilityController } from "../controllers/eligibility.controller";

const router = Router();

// Update nextEligible for a user
router.put("/:id", EligibilityController.update);

export default router;
