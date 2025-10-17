import { Request, Response } from "express";
import { PrismaClient, ParticipationStatus, Prisma, ApprovalStatus } from "@prisma/client";
import { CampaignWhereClause } from "../types/campaign.types.js";
import { CampaignService } from "../services/campaigns.service.js";
import { PushService } from "../services/push.service.js";
import { SSE } from "../utils/sse.js";
import { QRScanResultType, ScanQRRequest, MarkAttendanceQRRequest } from "../types/qr.types.js";

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

      const where: Prisma.CampaignWhereInput = {};

      if (status === "active") {
        where.isActive = true;
        where.startTime = { gte: new Date() };
        // Only include approved campaigns in active listing
        where.isApproved = ApprovalStatus.ACCEPTED;
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
            where: where as unknown as Prisma.CampaignWhereInput,
            include: {
              medicalEstablishment: true,
              organizer: {
                select: {
                  id: true,
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
          prisma.campaign.count({ where: where as unknown as Prisma.CampaignWhereInput }),
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
          organizerId: campaign.organizerId, // Direct field from Campaign table
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
        const where: Prisma.CampaignWhereInput = {
          isActive: true,
          startTime: { gte: new Date() },
          isApproved: ApprovalStatus.ACCEPTED,
          ...(featured === "true" && { expectedDonors: { gte: 50 } }),
        };

        const campaignResults = await prisma.campaign.findMany({
          where: where as unknown as Prisma.CampaignWhereInput,
          include: {
            medicalEstablishment: true,
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
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
          organizerId: campaign.organizerId, // Direct field from Campaign table
          organizer: campaign.organizer,
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

      if (!campaign.isActive || campaign.isApproved !== ApprovalStatus.ACCEPTED) {
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

  // GET /campaigns/pending - Get campaigns pending approval (admin/organizer)
  getPendingCampaigns: async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = "1", limit = "10" } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      if (isNaN(pageNum) || pageNum <= 0 || isNaN(limitNum) || limitNum <= 0) {
        res.status(400).json({ success: false, error: "Invalid pagination parameters", campaigns: [], data: { campaigns: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0 } } });
        return;
      }

      const result = await CampaignService.getPendingCampaigns({ page: pageNum, limit: limitNum });

      const campaigns = result.data?.campaigns || [];
      const pagination = result.data?.pagination || { page: pageNum, limit: limitNum, total: 0, totalPages: 0 };

      res.status(200).json({
        success: true,
        campaigns,
        data: {
          campaigns,
          pagination,
        },
      });
    } catch (error) {
      console.error("Get pending campaigns error:", error);
      res.status(500).json({ success: false, error: "Internal server error", campaigns: [], data: { campaigns: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0 } } });
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

      const [campaignResults, totalCount] = await Promise.all([
        prisma.campaign.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            medicalEstablishment: {
              select: {
                id: true,
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

      // Transform the response to ensure proper serialization
      const campaigns = campaignResults.map(campaign => ({
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
        updatedAt: campaign.updatedAt,
        organizerId: campaign.organizerId, // This is the direct field value from Campaign table
        medicalEstablishment: {
          id: campaign.medicalEstablishment.id,
          name: campaign.medicalEstablishment.name,
          address: campaign.medicalEstablishment.address,
        },
        participantsCount: campaign._count.participations,
      }));

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

  // GET /campaigns/pending/medical-establishment/:medicalEstablishmentId
  getPendingCampaignsByMedicalEstablishment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { medicalEstablishmentId } = req.params;
      const { page = '1', limit = '10' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      if (!medicalEstablishmentId) {
        res.status(400).json({ success: false, error: 'medicalEstablishmentId is required' });
        return;
      }

      if (isNaN(pageNum) || isNaN(limitNum) || pageNum <= 0 || limitNum <= 0) {
        res.status(400).json({ success: false, error: 'Invalid pagination parameters' });
        return;
      }

      const result = await CampaignService.getPendingByMedicalEstablishment(medicalEstablishmentId, { page: pageNum, limit: limitNum });

      const campaigns = result.data?.campaigns || [];
      const pagination = result.data?.pagination || { page: pageNum, limit: limitNum, total: 0, totalPages: 0 };

      res.status(200).json({
        success: true,
        campaigns,
        data: {
          campaigns,
          pagination,
        },
      });
    } catch (error) {
      console.error('Get pending campaigns by medical establishment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
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
        // Auto-register on-site and mark attendance
        const created = await prisma.campaignParticipation.create({
          data: {
            campaignId,
            userId,
            attendanceMarked: true,
            donationCompleted,
            status: donationCompleted ? 'COMPLETED' : 'ATTENDED',
            pointsEarned: donationCompleted ? 10 : 5,
          },
        });

        // Increment campaign actual donors counter for new attendee
        try {
          await prisma.campaign.update({ where: { id: campaignId }, data: { actualDonors: { increment: 1 } } });
        } catch {
          // ignore
        }

        // Side effects: push + SSE (optional parity with QR flow)
        // Create immediate DONATION_ELIGIBLE notification for donor
        try {
          await prisma.notification.create({
            data: {
              userId,
              type: "DONATION_ELIGIBLE",
              title: "QR scanned",
              message:
                "Your attendance has been verified. You can now proceed with the donation form.",
              isRead: false,
              metadata: {
                campaignId,
                scannedAt: new Date().toISOString(),
              },
            },
          });
        } catch (e) {
          console.error(
            "Failed to create DONATION_ELIGIBLE notification (manual attendance create):",
            e
          );
        }
        try {
          await PushService.sendToUser(userId, {
            title: "Attendance Marked",
            body: "Your attendance was recorded successfully.",
            data: {
              type: "CAMPAIGN_ATTENDANCE",
              campaignId,
              participationId: created.id,
              scannedAt: created.scannedAt ?? new Date(),
            },
          });
        } catch (e) {
          console.warn('Push send error (manual attendance):', e);
        }
        try {
          SSE.sendToUser(userId, 'attendance', {
            campaignId,
            participationId: created.id,
            status: created.status,
            scannedAt: created.scannedAt ?? new Date(),
          });
        } catch (e) {
          console.warn('SSE emit error (manual attendance):', e);
        }

        res.status(200).json({
          success: true,
          participation: created,
          autoRegistered: true,
        });
        return;
      }

      const wasMarked = participation.attendanceMarked;
      const updatedParticipation = await prisma.campaignParticipation.update({
        where: { id: participation.id },
        data: {
          attendanceMarked: true,
          donationCompleted,
          status: donationCompleted ? 'COMPLETED' : 'ATTENDED',
          pointsEarned: donationCompleted ? 10 : 5, // Example points
        },
      });

      if (!wasMarked) {
        try {
          await prisma.campaign.update({ where: { id: campaignId }, data: { actualDonors: { increment: 1 } } });
        } catch {
          // ignore
        }
      }

      // Side effects: push + SSE (optional parity with QR flow)
      // Create immediate DONATION_ELIGIBLE notification for donor
      try {
        await prisma.notification.create({
          data: {
            userId,
            type: "DONATION_ELIGIBLE",
            title: "QR scanned",
            message:
              "Your attendance has been verified. You can now proceed with the donation form.",
            isRead: false,
            metadata: {
              campaignId,
              scannedAt: new Date().toISOString(),
            },
          },
        });
      } catch (e) {
        console.error(
          "Failed to create DONATION_ELIGIBLE notification (manual attendance update):",
          e
        );
      }
      try {
        await PushService.sendToUser(userId, {
          title: "Attendance Marked",
          body: "Your attendance was recorded successfully.",
          data: {
            type: "CAMPAIGN_ATTENDANCE",
            campaignId,
            participationId: updatedParticipation.id,
            scannedAt: updatedParticipation.scannedAt ?? new Date(),
          },
        });
      } catch (e) {
        console.warn('Push send error (manual attendance update):', e);
      }
      try {
        SSE.sendToUser(userId, 'attendance', {
          campaignId,
          participationId: updatedParticipation.id,
          status: updatedParticipation.status,
          scannedAt: updatedParticipation.scannedAt ?? new Date(),
        });
      } catch (e) {
        console.warn('SSE emit error (manual attendance update):', e);
      }

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
      const { isActive, isApproved } = req.body as { isActive?: boolean; isApproved?: boolean | ApprovalStatus | string };

      // Map possible boolean/string inputs to the enum
      let mappedApproval: ApprovalStatus | undefined = undefined;
      if (typeof isApproved === 'boolean') {
        mappedApproval = isApproved ? ApprovalStatus.ACCEPTED : ApprovalStatus.CANCELLED;
      } else if (typeof isApproved === 'string') {
        const up = isApproved.toUpperCase();
        if (up === 'PENDING' || up === 'ACCEPTED' || up === 'CANCELLED') {
          mappedApproval = up as ApprovalStatus;
        }
      }

      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(mappedApproval !== undefined && { isApproved: mappedApproval }),
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

  // PATCH /campaigns/:campaignId/approval
  setCampaignApproval: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { approval } = req.body; // expected 'ACCEPTED' or 'REJECTED' (or 'CANCELLED')

      if (!campaignId || !approval) {
        res.status(400).json({ success: false, error: 'campaignId and approval are required' });
        return;
      }

  const result = await CampaignService.setCampaignApproval(campaignId, approval as string, (req as AuthenticatedRequest).user?.id);

      if (!result.success) {
        res.status(result.statusCode || 400).json({ success: false, error: result.error || 'Failed to set approval' });
        return;
      }

      res.status(200).json({ success: true, campaign: result.campaign });
    } catch (error) {
      console.error('Set campaign approval error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
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
          let participation = await prisma.campaignParticipation.findFirst({
            where: {
              campaignId,
              userId: attendee.userId,
            },
          });

          const donationCompleted = attendee.donationCompleted || false;
          if (participation) {
            const updated = await prisma.campaignParticipation.update({
              where: { id: participation.id },
              data: {
                attendanceMarked: true,
                donationCompleted,
                status: donationCompleted ? 'COMPLETED' : 'ATTENDED',
                pointsEarned: donationCompleted ? 10 : 5,
              },
            });
            // Create immediate DONATION_ELIGIBLE notification
            try {
              await prisma.notification.create({
                data: {
                  userId: attendee.userId,
                  type: "DONATION_ELIGIBLE",
                  title: "QR scanned",
                  message:
                    "Your attendance has been verified. You can now proceed with the donation form.",
                  isRead: false,
                  metadata: {
                    campaignId,
                    scannedAt: new Date().toISOString(),
                  },
                },
              });
            } catch (e) {
              console.error(
                `Failed to create DONATION_ELIGIBLE notification (manual-attendance update for ${attendee.userId}):`,
                e
              );
            }
            results.push({ success: true, userId: attendee.userId, participation: updated });
          } else {
            // Auto-register on-site and mark attendance
            participation = await prisma.campaignParticipation.create({
              data: {
                campaignId,
                userId: attendee.userId,
                attendanceMarked: true,
                donationCompleted,
                status: donationCompleted ? 'COMPLETED' : 'ATTENDED',
                pointsEarned: donationCompleted ? 10 : 5,
              },
            });
            // Create immediate DONATION_ELIGIBLE notification
            try {
              await prisma.notification.create({
                data: {
                  userId: attendee.userId,
                  type: "DONATION_ELIGIBLE",
                  title: "QR scanned",
                  message:
                    "Your attendance has been verified. You can now proceed with the donation form.",
                  isRead: false,
                  metadata: {
                    campaignId,
                    scannedAt: new Date().toISOString(),
                  },
                },
              });
            } catch (e) {
              console.error(
                `Failed to create DONATION_ELIGIBLE notification (manual-attendance create for ${attendee.userId}):`,
                e
              );
            }
            results.push({ success: true, userId: attendee.userId, participation, autoRegistered: true });
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

  // PUT /campaigns/:id - Update campaign (organizer only)
  updateCampaign: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
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

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to update campaigns",
        });
        return;
      }

      // Check if campaign exists and user is the organizer
      const existingCampaign = await prisma.campaign.findUnique({
        where: { id },
        select: {
          organizerId: true,
          startTime: true,
          isApproved: true,
          _count: {
            select: {
              participations: true,
            },
          },
        },
      });

      if (!existingCampaign) {
        res.status(404).json({
          success: false,
          error: "Campaign not found",
          message: "The specified campaign does not exist",
        });
        return;
      }

      // Check if user is the organizer
      if (existingCampaign.organizerId !== userId) {
        res.status(403).json({
          success: false,
          error: "Unauthorized",
          message: "Only the campaign organizer can update this campaign",
        });
        return;
      }

      // Check if campaign has already started
      if (existingCampaign.startTime <= new Date()) {
        res.status(400).json({
          success: false,
          error: "Cannot update active campaign",
          message: "Cannot update a campaign that has already started",
        });
        return;
      }

      // If campaign has participants and significant changes are made, require re-approval
      const hasParticipants = existingCampaign._count.participations > 0;
      const needsReApproval = hasParticipants && (startTime || endTime || location || expectedDonors);

      // Prepare update data
      const updateData: Record<string, unknown> = {};
      
      // Build update data conditionally
      if (title !== undefined) updateData.title = title;
      if (type !== undefined) updateData.type = type;
      if (location !== undefined) updateData.location = location;
      if (motivation !== undefined) updateData.motivation = motivation;
      if (description !== undefined) updateData.description = description;
      if (startTime !== undefined) updateData.startTime = new Date(startTime);
      if (endTime !== undefined) updateData.endTime = new Date(endTime);
      if (expectedDonors !== undefined) updateData.expectedDonors = parseInt(expectedDonors);
      if (contactPersonName !== undefined) updateData.contactPersonName = contactPersonName;
      if (contactPersonPhone !== undefined) updateData.contactPersonPhone = contactPersonPhone;
      if (requirements !== undefined) updateData.requirements = requirements;

      // Handle medical establishment update using connect/disconnect
      if (medicalEstablishmentId !== undefined) {
        if (medicalEstablishmentId) {
          updateData.medicalEstablishment = {
            connect: { id: medicalEstablishmentId }
          };
        } else {
          updateData.medicalEstablishment = {
            disconnect: true
          };
        }
      }

      // Reset approval if significant changes made
      if (needsReApproval) {
        updateData.isApproved = ApprovalStatus.PENDING;
      }

      const updatedCampaign = await prisma.campaign.update({
        where: { id },
        data: updateData,
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
          _count: {
            select: {
              participations: true,
            },
          },
        },
      });

      // Create activity for campaign update
      try {
        const { ActivityService } = await import("../services/activity.service.js");
        await ActivityService.createActivity({
          userId,
          type: "CAMPAIGN_UPDATED",
          title: "Campaign Updated",
          description: `Updated campaign: ${updatedCampaign.title}${needsReApproval ? " (requires re-approval)" : ""}`,
          metadata: {
            campaignId: id,
            campaignTitle: updatedCampaign.title,
            needsReApproval,
          },
        });

        // Notify participants if significant changes were made
        if (needsReApproval && hasParticipants) {
          // Create notifications for all participants about campaign changes
          const participants = await prisma.campaignParticipation.findMany({
            where: { campaignId: id },
            select: { userId: true },
          });

          const notificationPromises = participants.map(participant =>
            prisma.notification.create({
              data: {
                userId: participant.userId,
                type: "CAMPAIGN_UPDATED",
                title: "Campaign Updated",
                message: `The campaign "${updatedCampaign.title}" has been updated and requires re-approval. Please check the latest details.`,
                metadata: {
                  campaignId: id,
                  campaignTitle: updatedCampaign.title,
                },
              },
            })
          );

          await Promise.all(notificationPromises);
        }
      } catch (activityError) {
        console.error("Error creating update activity:", activityError);
        // Don't fail the update if activity creation fails
      }

      res.status(200).json({
        success: true,
        campaign: updatedCampaign,
        message: needsReApproval 
          ? "Campaign updated successfully. Re-approval required due to significant changes."
          : "Campaign updated successfully.",
      });
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update campaign",
      });
    }
  },

  // DELETE /campaigns/:id - Delete campaign (organizer only)
  deleteCampaign: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to delete campaigns",
        });
        return;
      }

      // Check if campaign exists and user is the organizer
      const existingCampaign = await prisma.campaign.findUnique({
        where: { id },
        select: {
          organizerId: true,
          title: true,
          startTime: true,
          _count: {
            select: {
              participations: true,
            },
          },
        },
      });

      if (!existingCampaign) {
        res.status(404).json({
          success: false,
          error: "Campaign not found",
          message: "The specified campaign does not exist",
        });
        return;
      }

      // Check if user is the organizer
      if (existingCampaign.organizerId !== userId) {
        res.status(403).json({
          success: false,
          error: "Unauthorized",
          message: "Only the campaign organizer can delete this campaign",
        });
        return;
      }

      // Check if campaign has already started
      if (existingCampaign.startTime <= new Date()) {
        res.status(400).json({
          success: false,
          error: "Cannot delete active campaign",
          message: "Cannot delete a campaign that has already started",
        });
        return;
      }

      // Check if campaign has participants
      const hasParticipants = existingCampaign._count.participations > 0;
      
      if (hasParticipants) {
        // Notify participants before deletion
        const participants = await prisma.campaignParticipation.findMany({
          where: { campaignId: id },
          select: { userId: true },
        });

        const notificationPromises = participants.map(participant =>
          prisma.notification.create({
            data: {
              userId: participant.userId,
              type: "CAMPAIGN_CANCELLED",
              title: "Campaign Cancelled",
              message: `The campaign "${existingCampaign.title}" has been cancelled by the organizer.`,
              metadata: {
                campaignId: id,
                campaignTitle: existingCampaign.title,
              },
            },
          })
        );

        await Promise.all(notificationPromises);
      }

      // Delete campaign and related data (cascade delete)
      await prisma.$transaction(async (tx) => {
        // Delete participations first
        await tx.campaignParticipation.deleteMany({
          where: { campaignId: id },
        });

        // Delete related activities
        await tx.activity.deleteMany({
          where: {
            metadata: {
              path: ["campaignId"],
              equals: id,
            },
          },
        });

        // Delete related notifications
        await tx.notification.deleteMany({
          where: {
            metadata: {
              path: ["campaignId"],
              equals: id,
            },
          },
        });

        // Finally delete the campaign
        await tx.campaign.delete({
          where: { id },
        });
      });

      // Create activity for campaign deletion
      try {
        const { ActivityService } = await import("../services/activity.service.js");
        await ActivityService.createActivity({
          userId,
          type: "CAMPAIGN_CANCELLED",
          title: "Campaign Deleted",
          description: `Deleted campaign: ${existingCampaign.title}`,
          metadata: {
            campaignTitle: existingCampaign.title,
            participantsNotified: hasParticipants,
          },
        });
      } catch (activityError) {
        console.error("Error creating deletion activity:", activityError);
        // Don't fail the deletion if activity creation fails
      }

      res.status(200).json({
        success: true,
        message: `Campaign "${existingCampaign.title}" deleted successfully.${hasParticipants ? " Participants have been notified." : ""}`,
      });
    } catch (error) {
      console.error("Delete campaign error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to delete campaign",
      });
    }
  },

  // GET /campaigns/:id - Get single campaign details
  getCampaignDetails: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await CampaignService.getCampaignDetails(id);

      if (!result.success) {
        res.status(404).json({ success: false, error: result.error || 'Campaign not found' });
        return;
      }

      res.status(200).json(result.campaign);
    } catch (error) {
      console.error("Get campaign details error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch campaign details",
      });
    }
  },

  // Mark attendance via QR scan
  markAttendanceByQR: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { userId, notes }: MarkAttendanceQRRequest = req.body;
      const scannerId = req.user?.id;

      if (!scannerId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Verify campaign exists and user has permission to mark attendance
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { organizer: true },
      });

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
        return;
      }

      // Check if scanner has permission (organizer or authorized personnel)
      if (campaign.organizerId !== scannerId) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to mark attendance",
        });
        return;
      }

      // Find the participation record
      let participation = await prisma.campaignParticipation.findFirst({
        where: {
          userId,
          campaignId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              bloodGroup: true,
              email: true,
            },
          },
        },
      });

      if (!participation) {
        // Auto-register on-site and mark attendance
        participation = await prisma.campaignParticipation.create({
          data: {
            userId,
            campaignId,
            attendanceMarked: true,
            qrCodeScanned: true,
            scannedAt: new Date(),
            scannedById: scannerId,
            status: 'ATTENDED',
            pointsEarned: 5,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                bloodGroup: true,
                email: true,
              },
            },
          },
        });

        // Increment counter for new attendee
        try {
          await prisma.campaign.update({ where: { id: campaignId }, data: { actualDonors: { increment: 1 } } });
        } catch {
          // ignore
        }
        // Best-effort activity log
        try {
          await prisma.activity.create({
            data: {
              userId,
              type: 'CAMPAIGN_JOINED',
              title: 'Joined Campaign (On-site)',
              description: 'Registered on-site for campaign',
              metadata: { campaignId },
            },
          });
        } catch {
          // ignore
        }
      }

      // Update participation with attendance
      const wasMarkedQR = participation.attendanceMarked;
      const updatedParticipation = await prisma.campaignParticipation.update({
        where: { id: participation.id },
        data: {
          attendanceMarked: true,
          qrCodeScanned: true,
          scannedAt: new Date(),
          scannedById: scannerId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              bloodGroup: true,
              email: true,
            },
          },
        },
      });

      if (!wasMarkedQR) {
        try {
          await prisma.campaign.update({ where: { id: campaignId }, data: { actualDonors: { increment: 1 } } });
        } catch {
          // ignore
        }
      }

      // Create activity record for the user
      await prisma.activity.create({
        data: {
          userId,
          type: "QR_SCANNED",
          title: "Campaign Attendance Marked",
          description: `Your attendance was marked for campaign: ${campaign.title}`,
          metadata: {
            campaignId,
            scannerId,
            attendanceMethod: "QR_SCAN",
            notes: notes || null,
          },
        },
      });

      const scanResult: QRScanResultType = {
        scanId: `attendance_${updatedParticipation.id}`,
        scanType: "CAMPAIGN_ATTENDANCE",
        scannedUser: {
          id: participation.user.id,
          name: participation.user.name,
          bloodGroup: participation.user.bloodGroup || "Unknown",
        },
        timestamp: new Date(),
        participationUpdated: true,
        participationId: participation.id,
      };

      res.status(200).json({
        success: true,
        message: "Attendance marked successfully",
        scanResult,
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

  // Process QR scan for campaign attendance
  processQRScan: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { qrData, location }: ScanQRRequest = req.body;
      const authenticatedUserId = req.user?.id;

      if (!authenticatedUserId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Parse QR data to extract user information
      let qrContent;
      try {
        qrContent = JSON.parse(qrData);
      } catch {
        res.status(400).json({
          success: false,
          error: "Invalid QR code format",
        });
        return;
      }

  const scannedUserId = qrContent.userId || qrContent.scannedUserId || qrContent.uid;
      if (!scannedUserId) {
        res.status(400).json({
          success: false,
          error: "QR code does not contain valid user information",
        });
        return;
      }

      // Mark attendance using the QR scan data
      const markAttendanceRequest: MarkAttendanceQRRequest = {
        userId: scannedUserId,
        campaignId,
        notes: `QR scan at ${location ? `${location.latitude}, ${location.longitude}` : 'unknown location'}`,
      };

      // Call the mark attendance function
      req.params.campaignId = campaignId;
      req.body = markAttendanceRequest;
      await CampaignsController.markAttendanceByQR(req, res);
    } catch (error) {
      console.error("Process QR scan error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to process QR scan",
      });
    }
  },
};
