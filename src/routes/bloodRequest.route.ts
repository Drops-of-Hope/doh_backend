import { Router } from "express";
import { BloodRequestController } from "../controllers/bloodRequest.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import { UserType } from "@prisma/client";

const router = Router();

/**
 * @route POST /blood-requests
 * @description Create a new blood request
 * @access Private - Medical Staff/Medical Officers only
 */
router.post("/",
  authenticateToken,
  authorizeRoles([UserType.STAFF, UserType.MEDICAL_OFFICER]),
  BloodRequestController.createBloodRequest
);

/**
 * @route GET /blood-requests
 * @description Get all blood requests with optional filters
 * @access Private - Medical Staff/Medical Officers/Admin only
 */
router.get("/",
  authenticateToken,
  authorizeRoles([UserType.STAFF, UserType.MEDICAL_OFFICER, UserType.ADMIN]),
  BloodRequestController.getBloodRequests
);

/**
 * @route GET /blood-requests/:id
 * @description Get a specific blood request by ID
 * @access Private - Medical Staff/Medical Officers/Admin only
 */
router.get("/:id",
  authenticateToken,
  authorizeRoles([UserType.STAFF, UserType.MEDICAL_OFFICER, UserType.ADMIN]),
  BloodRequestController.getBloodRequestById
);

/**
 * @route PATCH /blood-requests/:id/status
 * @description Update the status of a blood request
 * @access Private - Medical Staff/Medical Officers only
 */
router.patch("/:id/status",
  authenticateToken,
  authorizeRoles([UserType.STAFF, UserType.MEDICAL_OFFICER]),
  BloodRequestController.updateBloodRequestStatus
);

export default router;