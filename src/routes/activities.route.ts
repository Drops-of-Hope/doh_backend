import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// GET /activities/user - Get user activities for mobile app
router.get("/user", authenticateToken, UserController.getActivities);

export default router;