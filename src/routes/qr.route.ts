import { Router } from "express";
import { QRController } from "../controllers/qr.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// POST /qr/scan
router.post("/scan", authenticateToken, QRController.scanQR);

// POST /qr/generate - Generate QR code for user
router.post("/generate", authenticateToken, QRController.generateQR);

// POST /qr/mark-attendance - Mark attendance via QR scan
router.post("/mark-attendance", authenticateToken, QRController.markAttendanceQR);

export default router;