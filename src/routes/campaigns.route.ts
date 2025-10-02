import { Router } from "express";
import { CampaignsController } from "../controllers/campaigns.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";

const router = Router();

// GET /campaigns
router.get("/", CampaignsController.getCampaigns);

// GET /campaigns/upcoming
router.get("/upcoming", CampaignsController.getUpcomingCampaigns);

// POST /campaigns/:id/join
router.post("/:id/join", authenticateToken, CampaignsController.joinCampaign);

export default router;