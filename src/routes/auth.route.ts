import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();

// POST /auth/login
router.post("/login", AuthController.login);

// POST /auth/register  
router.post("/register", AuthController.register);

// GET /auth/callback
router.get("/callback", AuthController.callback);

export default router;