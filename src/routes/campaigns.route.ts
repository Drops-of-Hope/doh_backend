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

// GET /campaigns/organizer/:organizerId - Get campaigns by organizer
router.get("/organizer/:organizerId", authenticateToken, CampaignsController.getCampaignsByOrganizer);

// POST /campaigns - Create new campaign
router.post("/", authenticateToken, CampaignsController.createCampaign);

// GET /campaigns/:campaignId/stats - Get campaign statistics
router.get("/:campaignId/stats", authenticateToken, CampaignsController.getCampaignStats);

// POST /campaigns/:campaignId/attendance - Mark attendance for participant
router.post("/:campaignId/attendance", authenticateToken, CampaignsController.markAttendance);

// GET /campaigns/:campaignId/attendance - Get campaign attendance records
router.get("/:campaignId/attendance", authenticateToken, CampaignsController.getCampaignAttendance);

// PATCH /campaigns/:campaignId/status - Update campaign status (admin)
router.patch("/:campaignId/status", authenticateToken, CampaignsController.updateCampaignStatus);

// POST /campaigns/:campaignId/manual-attendance - Manual attendance marking
router.post("/:campaignId/manual-attendance", authenticateToken, CampaignsController.manualAttendanceMarking);

export default router;