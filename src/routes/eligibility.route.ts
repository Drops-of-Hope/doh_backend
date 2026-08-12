import { Router } from "express";
import { EligibilityController } from "../controllers/eligibility.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";
import {
  validateRequest,
  eligibilityUpdateSchema,
} from "../middlewares/validateRequest.js";

const router = Router();

// Update nextEligible for a user (safety-critical: requires auth + validation)
router.put(
  "/:id",
  authenticateToken,
  validateRequest(eligibilityUpdateSchema),
  EligibilityController.update
);

export default router;
