import { Request, Response } from "express";
import { PrismaClient, ParticipationStatus } from "@prisma/client";
import { CampaignWhereClause } from "../types/campaign.types.js";
import { CampaignService } from "../services/campaigns.service.js";

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

      // Validate pagination parameters
      if (isNaN(limitNum) || isNaN(pageNum) || limitNum <= 0 || pageNum <= 0) {
        res.status(400).json({
          success: false,
          error: "Invalid pagination parameters",
          campaigns: [],
          data: { campaigns: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0 } },
        });
        return;
      }

      const where: CampaignWhereClause = {};

      if (status === "active") {
        where.isActive = true;
        where.startTime = { gte: new Date() };
      }

      if (featured === "true") {
        // Assuming featured campaigns are those with high expected donors or recent
        where.expectedDonors = { gte: 50 };
      }

      // Use service for data fetching with fallback to direct query
      let campaigns = [];
      let totalCount = 0;

      try {
        const filters = {
          status: status as string,
          featured: featured as string,
          limit: limitNum,
          page: pageNum,
        };

        const result = await CampaignService.getCampaigns(filters);
        campaigns = result.data?.campaigns || [];
        totalCount = result.data?.pagination?.totalItems || 0;
      } catch (serviceError) {
        console.warn('Service error, falling back to direct query:', serviceError);
        
        // Fallback to direct Prisma query
        const [campaignResults, count] = await Promise.all([
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

        campaigns = campaignResults.map(campaign => ({
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
        }));
        totalCount = count;
      }

      const totalPages = Math.ceil(totalCount / limitNum);

      // Ensure campaigns is always an array
      const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

      // Multiple response formats for frontend compatibility
      const responseData = {
        success: true,
        campaigns: safeCampaigns, // Direct array for simple access
        data: {
          campaigns: safeCampaigns, // Nested for structured access
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems: totalCount,
          },
        },
      };

      res.status(200).json(responseData);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch campaigns",
        campaigns: [], // Ensure array is always present
        data: {
          campaigns: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
          },
        },
      });
    }
  },

  // GET /campaigns/upcoming
  getUpcomingCampaigns: async (req: Request, res: Response): Promise<void> => {
    try {
      const { featured, limit = "5" } = req.query;
      const limitNum = parseInt(limit as string);

      // Validate limit parameter
      if (isNaN(limitNum) || limitNum <= 0) {
        res.status(400).json({
          success: false,
          error: "Invalid limit parameter",
          campaigns: [],
          data: { campaigns: [] },
        });
        return;
      }

      const filters = {
        featured: featured as string,
        limit: limitNum,
      };

      let campaigns = [];

      try {
        const result = await CampaignService.getUpcomingCampaigns(filters);
        campaigns = result.data?.campaigns || [];
      } catch (serviceError) {
        console.warn('Service error, falling back to direct query:', serviceError);
        
        // Fallback to direct Prisma query
        const where = {
          isActive: true,
          startTime: { gte: new Date() },
          isApproved: true,
          ...(featured === "true" && { expectedDonors: { gte: 50 } }),
        };

        const campaignResults = await prisma.campaign.findMany({
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

        campaigns = campaignResults.map(campaign => ({
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
        }));
      }

      // Ensure campaigns is always an array
      const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

      res.status(200).json({
        success: true,
        campaigns: safeCampaigns, // Direct array access
        data: {
          campaigns: safeCampaigns, // Nested access
        },
      });
    } catch (error) {
      console.error("Get upcoming campaigns error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch upcoming campaigns",
        campaigns: [], // Ensure array is always present
        data: {
          campaigns: [],
        },
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

  // GET /campaigns/organizer/:organizerId
  getCampaignsByOrganizer: async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizerId } = req.params;
      const { status, page = "1", limit = "10" } = req.query;

      const limitNum = parseInt(limit as string);
      const pageNum = parseInt(page as string);
      const skip = (pageNum - 1) * limitNum;

      const where: { organizerId: string; isActive?: boolean } = { organizerId };
      
      if (status) {
        where.isActive = status === 'active';
      }

      const [campaigns, totalCount] = await Promise.all([
        prisma.campaign.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            medicalEstablishment: {
              select: {
                name: true,
                address: true,
              },
            },
            _count: {
              select: {
                participations: true,
              },
            },
          },
        }),
        prisma.campaign.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        campaigns,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      console.error("Get campaigns by organizer error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get campaigns",
      });
    }
  },

  // POST /campaigns
  createCampaign: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        type,
        location,
        motivation,
        description,
        startTime,
        endTime,
        expectedDonors,
        contactPersonName,
        contactPersonPhone,
        medicalEstablishmentId,
        requirements,
      } = req.body;

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to create campaigns",
        });
        return;
      }

      const campaign = await prisma.campaign.create({
        data: {
          title,
          type,
          location,
          motivation,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          expectedDonors: parseInt(expectedDonors),
          contactPersonName,
          contactPersonPhone,
          medicalEstablishmentId,
          organizerId: req.user?.id || '',
          isApproved: false, // Requires approval
          requirements: requirements || {},
        },
        include: {
          medicalEstablishment: {
            select: {
              name: true,
              address: true,
            },
          },
          organizer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        campaign,
      });
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create campaign",
      });
    }
  },

  // GET /campaigns/:campaignId/stats
  getCampaignStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;

      const [campaign, participationStats, donationStats] = await Promise.all([
        prisma.campaign.findUnique({
          where: { id: campaignId },
          select: {
            title: true,
            expectedDonors: true,
            actualDonors: true,
            startTime: true,
            endTime: true,
          },
        }),
        prisma.campaignParticipation.groupBy({
          by: ['status'],
          where: { campaignId },
          _count: { status: true },
        }),
        prisma.campaignParticipation.findMany({
          where: {
            campaignId,
            donationCompleted: true,
          },
          select: {
            pointsEarned: true,
            user: {
              select: {
                bloodGroup: true,
              },
            },
          },
        }),
      ]);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
        return;
      }

      const participationByStatus = participationStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>);

      const bloodGroupDistribution = donationStats.reduce((acc, donation) => {
        const bloodGroup = donation.user.bloodGroup;
        acc[bloodGroup] = (acc[bloodGroup] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalPointsEarned = donationStats.reduce((sum, donation) => sum + donation.pointsEarned, 0);

      res.status(200).json({
        success: true,
        stats: {
          campaign: {
            title: campaign.title,
            expectedDonors: campaign.expectedDonors,
            actualDonors: campaign.actualDonors,
            startTime: campaign.startTime,
            endTime: campaign.endTime,
          },
          participation: participationByStatus,
          donations: {
            totalDonations: donationStats.length,
            totalPointsEarned,
            bloodGroupDistribution,
          },
        },
      });
    } catch (error) {
      console.error("Get campaign stats error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get campaign stats",
      });
    }
  },

  // POST /campaigns/:campaignId/attendance
  markAttendance: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { userId, donationCompleted = false } = req.body;

      const participation = await prisma.campaignParticipation.findFirst({
        where: {
          campaignId,
          userId,
        },
      });

      if (!participation) {
        res.status(404).json({
          success: false,
          error: "Participation not found",
        });
        return;
      }

      const updatedParticipation = await prisma.campaignParticipation.update({
        where: { id: participation.id },
        data: {
          attendanceMarked: true,
          donationCompleted,
          status: donationCompleted ? 'COMPLETED' : 'ATTENDED',
          pointsEarned: donationCompleted ? 10 : 5, // Example points
        },
      });

      res.status(200).json({
        success: true,
        participation: updatedParticipation,
      });
    } catch (error) {
      console.error("Mark attendance error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to mark attendance",
      });
    }
  },

  // GET /campaigns/:campaignId/attendance
  getCampaignAttendance: async (req: Request, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { status, page = "1", limit = "10" } = req.query;

      const limitNum = parseInt(limit as string);
      const pageNum = parseInt(page as string);
      const skip = (pageNum - 1) * limitNum;

      const where: { campaignId: string; status?: ParticipationStatus } = { campaignId };
      
      if (status) {
        // Validate status is a valid ParticipationStatus
        const validStatuses = ['REGISTERED', 'CONFIRMED', 'ATTENDED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
        if (validStatuses.includes(status as string)) {
          where.status = status as ParticipationStatus;
        }
      }

      const [attendees, totalCount] = await Promise.all([
        prisma.campaignParticipation.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { registrationDate: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                nic: true,
                bloodGroup: true,
              },
            },
          },
        }),
        prisma.campaignParticipation.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        attendees,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      console.error("Get campaign attendance error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get campaign attendance",
      });
    }
  },

  // PATCH /campaigns/:campaignId/status
  updateCampaignStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { isActive, isApproved } = req.body;

      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(isApproved !== undefined && { isApproved }),
          updatedAt: new Date(),
        },
        include: {
          organizer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        campaign,
      });
    } catch (error) {
      console.error("Update campaign status error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update campaign status",
      });
    }
  },

  // POST /campaigns/:campaignId/manual-attendance
  manualAttendanceMarking: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { attendees } = req.body; // Array of { userId, donationCompleted }

      const results = [];

      for (const attendee of attendees) {
        try {
          const participation = await prisma.campaignParticipation.findFirst({
            where: {
              campaignId,
              userId: attendee.userId,
            },
          });

          if (participation) {
            const updated = await prisma.campaignParticipation.update({
              where: { id: participation.id },
              data: {
                attendanceMarked: true,
                donationCompleted: attendee.donationCompleted || false,
                status: attendee.donationCompleted ? 'COMPLETED' : 'ATTENDED',
                pointsEarned: attendee.donationCompleted ? 10 : 5,
              },
            });
            results.push({ success: true, userId: attendee.userId, participation: updated });
          } else {
            results.push({ success: false, userId: attendee.userId, error: 'Participation not found' });
          }
        } catch (err) {
          console.error(`Error updating attendance for user ${attendee.userId}:`, err);
          results.push({ success: false, userId: attendee.userId, error: 'Failed to update' });
        }
      }

      res.status(200).json({
        success: true,
        results,
      });
    } catch (error) {
      console.error("Manual attendance marking error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to mark attendance",
      });
    }
  },
};
