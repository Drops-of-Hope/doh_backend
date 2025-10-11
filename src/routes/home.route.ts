import { Router } from "express";
import { HomeController } from "../controllers/home.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// GET /home/dashboard
router.get("/dashboard", authenticateToken, HomeController.getDashboard);

// GET /home/data (for mobile app)
router.get("/data", authenticateToken, HomeController.getHomeData);

// GET /home/stats
router.get("/stats", authenticateToken, HomeController.getStats);

export default router;