import { Router } from "express";
import { EligibilityController } from "../controllers/eligibility.controller.js";

const router = Router();

// Update nextEligible for a user
router.put("/:id", EligibilityController.update);

export default router;
