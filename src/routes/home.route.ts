import { Router } from "express";
import { HomeController } from "../controllers/home.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// GET /home/dashboard
router.get("/dashboard", authenticateToken, HomeController.getDashboard);

// GET /home/stats
router.get("/stats", authenticateToken, HomeController.getStats);

export default router;