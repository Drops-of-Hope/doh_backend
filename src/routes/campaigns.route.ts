import { Router } from "express";
import { CampaignsController } from "../controllers/campaigns.controller.js";
import { authenticateToken } from "../middlewares/authenticateUser.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";

const router = Router();

// GET /campaigns
router.get("/", CampaignsController.getCampaigns);

// GET /campaigns/upcoming
router.get("/upcoming", CampaignsController.getUpcomingCampaigns);

// GET /campaigns/pending - Get campaigns pending approval
router.get("/pending", CampaignsController.getPendingCampaigns);

// GET /campaigns/pending/medical-establishment/:medicalEstablishmentId - Get pending campaigns for a medical establishment
router.get('/pending/medical-establishment/:medicalEstablishmentId', CampaignsController.getPendingCampaignsByMedicalEstablishment);

// GET /campaigns/:id - Get single campaign details
router.get("/:id", CampaignsController.getCampaignDetails);

// POST /campaigns - Create new campaign
router.post("/", authenticateToken, CampaignsController.createCampaign);

// PUT /campaigns/:id - Update campaign (organizer only)
router.put("/:id", authenticateToken, CampaignsController.updateCampaign);

// DELETE /campaigns/:id - Delete campaign (organizer only)
router.delete("/:id", authenticateToken, CampaignsController.deleteCampaign);

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

// PATCH /campaigns/:campaignId/approval - Approve or reject a campaign
router.patch('/:campaignId/approval', CampaignsController.setCampaignApproval);

// POST /campaigns/:campaignId/manual-attendance - Manual attendance marking
router.post("/:campaignId/manual-attendance", authenticateToken, CampaignsController.manualAttendanceMarking);

// GET /campaigns/:id/my-registration - current user participation
router.get("/:id/my-registration", authenticateToken, async (req: AuthenticatedRequest, res) => {
	const { PrismaClient } = await import("@prisma/client");
	const prisma = new PrismaClient();
	const userId = req.user?.id;
	if (!userId) {
		res.status(401).json({ success: false, error: "Unauthorized" });
		return;
	}
	const { id } = req.params;
	const participation = await prisma.campaignParticipation.findFirst({
		where: { campaignId: id, userId },
	});
	res.status(200).json({
		success: true,
		participation: participation ? {
			id: participation.id,
			campaignId: participation.campaignId,
			userId: participation.userId,
			status: participation.status,
			attendanceMarked: participation.attendanceMarked,
			donationCompleted: participation.donationCompleted,
			pointsEarned: participation.pointsEarned,
			scannedAt: participation.scannedAt,
		} : null,
	});
});
export default router;