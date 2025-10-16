import { prisma } from '../config/db.js';
import { Prisma, ApprovalStatus } from '@prisma/client';

interface CampaignFilters {
  status?: string;
  featured?: string;
  limit?: number;
  page?: number;
  organizerId?: string;
}

interface AttendanceFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export const CampaignRepository = {
  // Find many campaigns with filters
  findMany: async (filters: CampaignFilters) => {
    const { status, featured, limit = 10, page = 1 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignWhereInput = {};

    if (status === "active") {
      where.isActive = true;
      where.startTime = { gte: new Date() };
    }

    if (featured === "true") {
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
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
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
        currentPage: page,
        totalPages,
        totalItems: totalCount,
      },
    };
  },

  // Find upcoming campaigns
  findUpcoming: async (filters: CampaignFilters) => {
    const { featured, limit = 5 } = filters;

    const where: Prisma.CampaignWhereInput = {
      isActive: true,
      startTime: { gte: new Date() },
      isApproved: ApprovalStatus.ACCEPTED as unknown as Prisma.EnumApprovalStatusFilter,
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
      take: limit,
    });

    return {
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
    };
  },

  // Find campaigns by organizer
  findByOrganizer: async (organizerId: string, filters: CampaignFilters) => {
    const { status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignWhereInput = { organizerId };
    
    if (status) {
      where.isActive = status === 'active';
    }

    const [campaigns, totalCount] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
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

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  // Find campaigns pending approval
  findPending: async (params: { page?: number; limit?: number } = {}) => {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignWhereInput = {
      isApproved: ApprovalStatus.PENDING as unknown as Prisma.EnumApprovalStatusFilter,
    } as Prisma.CampaignWhereInput;

    const [campaigns, totalCount] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          medicalEstablishment: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          _count: {
            select: { participations: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      campaigns: campaigns.map(campaign => ({
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        startTime: campaign.startTime,
        endTime: campaign.endTime,
        location: campaign.location,
        expectedDonors: campaign.expectedDonors,
        contactPersonName: campaign.contactPersonName,
        contactPersonPhone: campaign.contactPersonPhone,
        requirements: campaign.requirements,
        isApproved: campaign.isApproved,
        isActive: campaign.isActive,
        organizer: campaign.organizer,
        medicalEstablishment: campaign.medicalEstablishment,
        participantsCount: campaign._count.participations,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  // Find campaigns pending approval for a specific blood bank
  findPendingByMedicalEstablishment: async (medicalEstablishmentId: string, params: { page?: number; limit?: number } = {}) => {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignWhereInput = {
      medicalEstablishmentId,
      isApproved: ApprovalStatus.PENDING as unknown as Prisma.EnumApprovalStatusFilter,
    } as Prisma.CampaignWhereInput;

    const [campaigns, totalCount] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: { select: { id: true, name: true, email: true } },
          medicalEstablishment: { select: { id: true, name: true, address: true } },
          _count: { select: { participations: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      campaigns: campaigns.map(campaign => ({
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        startTime: campaign.startTime,
        endTime: campaign.endTime,
        location: campaign.location,
        expectedDonors: campaign.expectedDonors,
        contactPersonName: campaign.contactPersonName,
        contactPersonPhone: campaign.contactPersonPhone,
        requirements: campaign.requirements,
        isApproved: campaign.isApproved,
        isActive: campaign.isActive,
        organizer: campaign.organizer,
        medicalEstablishment: campaign.medicalEstablishment,
        participantsCount: campaign._count.participations,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
      pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
    };
  },

  // Create new campaign
  create: async (campaignData: Prisma.CampaignCreateInput) => {
    return await prisma.campaign.create({
      data: campaignData,
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
  },

  // Find campaign by ID
  findById: async (campaignId: string) => {
    return await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        medicalEstablishment: true,
        organizer: {
          select: {
            name: true,
            email: true,
          },
        },
        participations: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                bloodGroup: true,
              },
            },
          },
        },
      },
    });
  },

  // Update campaign
  update: async (campaignId: string, updateData: Prisma.CampaignUpdateInput) => {
    return await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...updateData,
        updatedAt: new Date(),
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
  },

  // Delete campaign
  delete: async (campaignId: string) => {
    return await prisma.campaign.delete({
      where: { id: campaignId },
    });
  },

  // Get campaign participants
  getCampaignParticipants: async (campaignId: string) => {
    return await prisma.campaignParticipation.findMany({
      where: { campaignId },
      select: {
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  },

  // Check if campaign has linked blood donations
  hasLinkedBloodDonations: async (campaignId: string): Promise<boolean> => {
    const count = await prisma.campaignParticipation.count({
      where: {
        campaignId,
        donationCompleted: true,
      },
    });
    return count > 0;
  },

  // Get campaign analytics
  getAnalytics: async (campaignId: string) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        participations: {
          include: {
            user: {
              select: {
                bloodGroup: true,
                totalDonations: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) return null;

    const totalRegistrations = campaign.participations.length;
    const attendedCount = campaign.participations.filter(p => p.attendanceMarked).length;
    const donationCount = campaign.participations.filter(p => p.donationCompleted).length;
    
    const bloodTypeDistribution = campaign.participations.reduce((acc, participation) => {
      const bloodGroup = participation.user.bloodGroup;
      acc[bloodGroup] = (acc[bloodGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topDonors = campaign.participations
      .filter(p => p.donationCompleted)
      .map(p => ({
        userId: p.userId,
        bloodGroup: p.user.bloodGroup,
        totalDonations: p.user.totalDonations,
        pointsEarned: p.pointsEarned,
      }))
      .sort((a, b) => b.totalDonations - a.totalDonations)
      .slice(0, 10);

    return {
      overview: {
        totalRegistrations,
        attendanceCount: attendedCount,
        donationCount,
        attendanceRate: totalRegistrations > 0 ? (attendedCount / totalRegistrations) * 100 : 0,
        donationRate: attendedCount > 0 ? (donationCount / attendedCount) * 100 : 0,
      },
      bloodTypeDistribution,
      topDonors,
      campaign: {
        title: campaign.title,
        expectedDonors: campaign.expectedDonors,
        actualDonors: campaign.actualDonors,
        startTime: campaign.startTime,
        endTime: campaign.endTime,
      },
    };
  },

  // Get campaign statistics
  getStats: async (campaignId: string) => {
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

    if (!campaign) return null;

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

    return {
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
    };
  },

  // Add participant to campaign
  addParticipant: async (campaignId: string, userId: string) => {
    // Check if campaign exists and is active
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (!campaign.isActive || !campaign.isApproved) {
      throw new Error('Campaign is not active or not approved');
    }

    if (campaign.startTime <= new Date()) {
      throw new Error('Campaign registration has closed');
    }

    // Check if user already joined
    const existingParticipation = await prisma.campaignParticipation.findFirst({
      where: {
        userId,
        campaignId,
      },
    });

    if (existingParticipation) {
      throw new Error('User already registered for this campaign');
    }

    // Create participation record
    const participation = await prisma.campaignParticipation.create({
      data: {
        userId,
        campaignId,
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
          campaignId,
          campaignTitle: campaign.title,
        },
      },
    });

    return participation;
  },

  // Mark attendance
  markAttendance: async (campaignId: string, userId: string, donationCompleted = false) => {
    const participation = await prisma.campaignParticipation.findFirst({
      where: {
        campaignId,
        userId,
      },
    });

    if (!participation) {
      throw new Error('Participation not found');
    }

    return await prisma.campaignParticipation.update({
      where: { id: participation.id },
      data: {
        attendanceMarked: true,
        donationCompleted,
        status: donationCompleted ? 'COMPLETED' : 'ATTENDED',
        pointsEarned: donationCompleted ? 10 : 5,
      },
    });
  },

  // Get campaign attendance
  getAttendance: async (campaignId: string, filters: AttendanceFilters) => {
    const { status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignParticipationWhereInput = { campaignId };
    
    if (status) {
      const validStatuses = ['REGISTERED', 'CONFIRMED', 'ATTENDED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
      if (validStatuses.includes(status)) {
        where.status = status as 'REGISTERED' | 'CONFIRMED' | 'ATTENDED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
      }
    }

    const [attendees, totalCount] = await Promise.all([
      prisma.campaignParticipation.findMany({
        where,
        skip,
        take: limit,
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

    return {
      attendees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  // Update campaign status
  updateStatus: async (campaignId: string, statusData: { isActive?: boolean; isApproved?: boolean }) => {
    // Cast data to any to tolerate schema enum vs boolean inconsistencies in the codebase
    return await prisma.campaign.update({
      where: { id: campaignId },
      data: ({
        ...statusData,
        updatedAt: new Date(),
      } as unknown as Prisma.CampaignUpdateInput),
      include: {
        organizer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  },

  // Update approval status using ApprovalStatus enum
  updateApproval: async (campaignId: string, approval: ApprovalStatus) => {
    return await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        isApproved: approval,
        updatedAt: new Date(),
      },
      include: {
        medicalEstablishment: true,
        organizer: { select: { name: true, email: true } },
      },
    });
  },

  // Bulk mark attendance
  bulkMarkAttendance: async (campaignId: string, attendees: Array<{ userId: string; donationCompleted?: boolean }>) => {
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
      } catch (error) {
        console.error(`Error updating attendance for user ${attendee.userId}:`, error);
        results.push({ success: false, userId: attendee.userId, error: 'Failed to update' });
      }
    }

    return results;
  },
};