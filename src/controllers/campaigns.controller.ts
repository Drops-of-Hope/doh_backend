import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { CampaignWhereClause, CampaignUpcomingWhereClause } from "../types/campaign.types.js";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    bloodGroup?: string;
    nic?: string;
  };
}

export const CampaignsController = {
  // GET /campaigns
  getCampaigns: async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, limit = "10", featured, page = "1" } = req.query;
      
      const limitNum = parseInt(limit as string);
      const pageNum = parseInt(page as string);
      const skip = (pageNum - 1) * limitNum;

      const where: CampaignWhereClause = {};

      if (status === "active") {
        where.isActive = true;
        where.startTime = { gte: new Date() };
      }

      if (featured === "true") {
        // Assuming featured campaigns are those with high expected donors or recent
        where.expectedDonors = { gte: 50 };
      }

      const [campaigns, totalCount] = await Promise.all([
        prisma.campaign.findMany({
          where,
          include: {
            medicalEstablishment: true,
            organizer: {
              select: {
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                participations: true,
              },
            },
          },
          orderBy: { startTime: "asc" },
          skip,
          take: limitNum,
        }),
        prisma.campaign.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      res.status(200).json({
        data: {
          campaigns: campaigns.map(campaign => ({
            id: campaign.id,
            title: campaign.title,
            type: campaign.type,
            location: campaign.location,
            description: campaign.description,
            motivation: campaign.motivation,
            startTime: campaign.startTime,
            endTime: campaign.endTime,
            expectedDonors: campaign.expectedDonors,
            actualDonors: campaign.actualDonors,
            contactPersonName: campaign.contactPersonName,
            contactPersonPhone: campaign.contactPersonPhone,
            isApproved: campaign.isApproved,
            isActive: campaign.isActive,
            imageUrl: campaign.imageUrl,
            requirements: campaign.requirements,
            createdAt: campaign.createdAt,
            medicalEstablishment: campaign.medicalEstablishment,
            organizer: campaign.organizer,
            participantsCount: campaign._count.participations,
          })),
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems: totalCount,
          },
        },
      });
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch campaigns",
      });
    }
  },

  // GET /campaigns/upcoming
  getUpcomingCampaigns: async (req: Request, res: Response): Promise<void> => {
    try {
      const { featured, limit = "5" } = req.query;
      const limitNum = parseInt(limit as string);

      const where: CampaignUpcomingWhereClause = {
        isActive: true,
        startTime: { gte: new Date() },
        isApproved: true,
      };

      if (featured === "true") {
        where.expectedDonors = { gte: 50 };
      }

      const campaigns = await prisma.campaign.findMany({
        where,
        include: {
          medicalEstablishment: true,
          organizer: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
        take: limitNum,
      });

      res.status(200).json({
        data: {
          campaigns: campaigns.map(campaign => ({
            id: campaign.id,
            title: campaign.title,
            type: campaign.type,
            location: campaign.location,
            description: campaign.description,
            startTime: campaign.startTime,
            endTime: campaign.endTime,
            expectedDonors: campaign.expectedDonors,
            actualDonors: campaign.actualDonors,
            imageUrl: campaign.imageUrl,
            organizer: campaign.organizer.name,
            medicalEstablishment: campaign.medicalEstablishment,
          })),
        },
      });
    } catch (error) {
      console.error("Get upcoming campaigns error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch upcoming campaigns",
      });
    }
  },

  // POST /campaigns/:id/join
  joinCampaign: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to join campaigns",
        });
        return;
      }

      // Check if campaign exists and is active
      const campaign = await prisma.campaign.findUnique({
        where: { id },
      });

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: "Campaign not found",
          message: "The specified campaign does not exist",
        });
        return;
      }

      if (!campaign.isActive || !campaign.isApproved) {
        res.status(400).json({
          success: false,
          error: "Campaign not available",
          message: "This campaign is not currently available for registration",
        });
        return;
      }

      if (campaign.startTime <= new Date()) {
        res.status(400).json({
          success: false,
          error: "Campaign already started",
          message: "Cannot join a campaign that has already started",
        });
        return;
      }

      // Check if user already joined
      const existingParticipation = await prisma.campaignParticipation.findFirst({
        where: {
          userId,
          campaignId: id,
        },
      });

      if (existingParticipation) {
        res.status(409).json({
          success: false,
          error: "Already registered",
          message: "You have already registered for this campaign",
        });
        return;
      }

      // Create participation record
      const participation = await prisma.campaignParticipation.create({
        data: {
          userId,
          campaignId: id,
          status: "REGISTERED",
        },
      });

      // Create activity record
      await prisma.activity.create({
        data: {
          userId,
          type: "CAMPAIGN_JOINED",
          title: "Joined Campaign",
          description: `Registered for campaign: ${campaign.title}`,
          metadata: {
            campaignId: id,
            campaignTitle: campaign.title,
          },
        },
      });

      res.status(200).json({
        success: true,
        participationId: participation.id,
      });
    } catch (error) {
      console.error("Join campaign error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to join campaign",
      });
    }
  },
};
