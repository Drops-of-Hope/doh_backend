import { Router } from "express";
import { QRController } from "../controllers/qr.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// POST /qr/scan
router.post("/scan", authenticateToken, QRController.scanQR);

// GET /qr/generate
router.get("/generate", authenticateToken, QRController.generateQR);

export default router;