import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";

const router = Router();

// Create or login user (when user authenticates with auth provider)
router.post("/create-or-login", UserController.createOrLoginUser);

// Complete user profile (after initial authentication)
router.post("/complete-profile", UserController.completeProfile);

// Check if user exists
router.get("/exists/:userId", UserController.checkUserExists);

// Get user profile
router.get("/:userId", UserController.getUserProfile);

export default router;
