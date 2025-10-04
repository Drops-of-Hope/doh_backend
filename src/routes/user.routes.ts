import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// Create or login user (when user authenticates with auth provider)
router.post("/create-or-login", UserController.createOrLoginUser);

// Complete user profile (after initial authentication)
router.post("/complete-profile", UserController.completeProfile);

// Check if user exists
router.get("/exists/:userId", UserController.checkUserExists);

// Get user profile (protected route)
router.get("/profile", authenticateToken, UserController.getProfile);

// Get user donation history (protected route)
router.get("/donation-history", authenticateToken, UserController.getDonationHistory);

// Get user eligibility (protected route)
router.get("/eligibility", authenticateToken, UserController.getEligibility);

// Update user profile (protected route)
router.put("/profile", authenticateToken, UserController.updateProfile);

// Get user activities (protected route)
router.get("/activities", authenticateToken, UserController.getActivities);

// Get user notifications (protected route)
router.get("/notifications", authenticateToken, UserController.getNotifications);

// Update donation stats after successful donation
router.post("/:userId/donation-completed", UserController.updateDonationStats);

// Get badge information for user
router.get("/:userId/badge-info", UserController.getBadgeInfo);

// Get user profile by ID (for backward compatibility)
router.get("/:userId", UserController.getUserProfile);

export default router;
