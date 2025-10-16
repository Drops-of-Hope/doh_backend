import { prisma } from '../config/db.js';
import { CreateCampaignRequest, CampaignStatsResponse, MarkAttendanceRequest } from '../types/campaignOrganizer.types.js';
import { Prisma, ApprovalStatus } from '@prisma/client';

export const CampaignOrganizerRepository = {
  // Get campaigns by organizer
  getCampaignsByOrganizer: async (organizerId: string, page = 1, limit = 10, status?: string) => {
    const skip = (page - 1) * limit;
    const where: Prisma.CampaignWhereInput = {
      organizerId,
    };

    if (status) {
      if (status === 'active') {
        where.isActive = true;
        where.isApproved = ApprovalStatus.ACCEPTED;
      } else if (status === 'pending') {
        where.isApproved = ApprovalStatus.PENDING;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
    }

    const [campaigns, total] = await Promise.all([
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
          participations: {
            select: {
              id: true,
              status: true,
            },
          },
          medicalEstablishment: {
            select: {
              name: true,
              address: true,
            },
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
        startDate: campaign.startTime,
        endDate: campaign.endTime,
        location: campaign.location,
        targetDonors: campaign.expectedDonors,
        bloodGroups: [], // Not in current schema
        requirements: campaign.requirements,
        contactInfo: campaign.contactPersonPhone,
        status: campaign.isApproved ? (campaign.isActive ? 'ACTIVE' : 'INACTIVE') : 'PENDING',
        organizerId: campaign.organizerId,
        organizer: campaign.organizer,
        currentRegistrations: campaign.participations.length,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Create new campaign
  createCampaign: async (data: CreateCampaignRequest) => {
    const campaign = await prisma.campaign.create({
      data: {
        title: data.title,
        description: data.description,
        type: 'MOBILE', // Default type
        location: data.location,
        organizerId: data.organizerId,
        motivation: data.description, // Using description as motivation
        startTime: new Date(data.startDate),
        endTime: new Date(data.endDate),
        expectedDonors: data.targetDonors,
        contactPersonName: 'Organizer', // Default
        contactPersonPhone: data.contactInfo,
        isApproved: ApprovalStatus.PENDING, // Needs approval
        isActive: true,
        requirements: data.requirements ? { requirements: data.requirements } : undefined,
        medicalEstablishmentId: '1', // Default establishment ID - should be dynamic
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      startDate: campaign.startTime,
      endDate: campaign.endTime,
      location: campaign.location,
      targetDonors: campaign.expectedDonors,
      bloodGroups: [],
      requirements: data.requirements,
      contactInfo: campaign.contactPersonPhone,
      status: 'PENDING',
      organizerId: campaign.organizerId,
      organizer: {
        id: campaign.organizerId,
        name: campaign.organizer?.name || 'Unknown',
        email: campaign.organizer?.email || 'unknown@email.com',
      },
      currentRegistrations: 0,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  },

  // Get campaign statistics
  getCampaignStats: async (campaignId: string): Promise<CampaignStatsResponse> => {
    const [participations, campaign] = await Promise.all([
      prisma.campaignParticipation.findMany({
        where: { campaignId },
        include: {
          user: {
            select: {
              bloodGroup: true,
            },
          },
        },
      }),
      prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    const totalRegistrations = participations.length;
    const attendanceMarked = participations.filter(p => p.attendanceMarked).length;
    const donationsCompleted = participations.filter(p => p.donationCompleted).length;
    const noShows = participations.filter(p => p.attendanceMarked && !p.donationCompleted).length;

    // Group by blood group
    const byBloodGroup: { [key: string]: number } = {};
    participations.forEach(p => {
      const bloodGroup = p.user.bloodGroup;
      byBloodGroup[bloodGroup] = (byBloodGroup[bloodGroup] || 0) + 1;
    });

    // Generate hourly stats (simplified for now)
    const byHour = [];
    if (campaign) {
      const startHour = campaign.startTime.getHours();
      const endHour = campaign.endTime.getHours();
      for (let hour = startHour; hour <= endHour; hour++) {
        byHour.push({
          hour,
          registrations: Math.floor(totalRegistrations / (endHour - startHour + 1)),
          attendance: Math.floor(attendanceMarked / (endHour - startHour + 1)),
        });
      }
    }

    return {
      totalRegistrations,
      attendanceMarked,
      donationsCompleted,
      noShows,
      byBloodGroup,
      byHour,
    };
  },

  // Mark attendance
  markAttendance: async (campaignId: string, data: MarkAttendanceRequest) => {
    const participation = await prisma.campaignParticipation.findFirst({
      where: {
        campaignId,
        userId: data.userId,
      },
    });

    if (!participation) {
      throw new Error('User is not registered for this campaign');
    }

    const updatedParticipation = await prisma.campaignParticipation.update({
      where: { id: participation.id },
      data: {
        attendanceMarked: true,
        scannedAt: data.scannedAt ? new Date(data.scannedAt) : new Date(),
        qrCodeScanned: data.method === 'QR',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            bloodGroup: true,
            nic: true,
            email: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Create QR scan record if QR method
    if (data.method === 'QR') {
      await prisma.qRScan.create({
        data: {
          scannerId: data.markedBy,
          scannedUserId: data.userId,
          campaignId,
          campaignParticipationId: updatedParticipation.id,
          scanType: 'CAMPAIGN_ATTENDANCE',
          metadata: data.notes ? { notes: data.notes } : undefined,
        },
      });
    }

    return {
      success: true,
      participation: {
        id: updatedParticipation.id,
        user: updatedParticipation.user,
        campaign: updatedParticipation.campaign,
        attendanceMarked: updatedParticipation.attendanceMarked,
        attendanceTime: updatedParticipation.scannedAt,
        method: data.method,
        qrCodeScanned: updatedParticipation.qrCodeScanned,
      },
    };
  },

  // Get campaign attendance records
  getCampaignAttendance: async (campaignId: string) => {
    const participations = await prisma.campaignParticipation.findMany({
      where: { campaignId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            bloodGroup: true,
            nic: true,
            email: true,
          },
        },
      },
      orderBy: { registrationDate: 'desc' },
    });

    return participations.map(participation => ({
      id: participation.id,
      user: participation.user,
      registrationDate: participation.registrationDate,
      attendanceMarked: participation.attendanceMarked,
      attendanceTime: participation.scannedAt,
      method: participation.qrCodeScanned ? 'QR' : 'MANUAL',
      donationCompleted: participation.donationCompleted,
      qrCodeScanned: participation.qrCodeScanned,
      pointsEarned: participation.pointsEarned,
      feedback: participation.feedback,
      feedbackRating: participation.feedbackRating,
      notes: '', // No notes field in current schema
    }));
  },

  // Update campaign status
  updateCampaignStatus: async (campaignId: string, status: string, comment?: string) => {
    const updateData: Prisma.CampaignUpdateInput = {};

    switch (status.toLowerCase()) {
      case 'approved':
        updateData.isApproved = ApprovalStatus.ACCEPTED;
        updateData.isActive = true;
        break;
      case 'rejected':
        updateData.isApproved = ApprovalStatus.CANCELLED;
        updateData.isActive = false;
        break;
      case 'suspended':
        updateData.isActive = false;
        break;
      case 'active':
        updateData.isActive = true;
        updateData.isApproved = ApprovalStatus.ACCEPTED;
        break;
    }

    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notification for organizer about status change
    if (comment) {
      await prisma.notification.create({
        data: {
          userId: campaign.organizerId,
          type: 'GENERAL',
          title: `Campaign ${status}`,
          message: `Your campaign "${campaign.title}" has been ${status}. ${comment}`,
          metadata: {
            campaignId: campaign.id,
            status,
            comment,
          },
        },
      });
    }

    return {
      success: true,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.isApproved ? (campaign.isActive ? 'ACTIVE' : 'INACTIVE') : 'PENDING',
        updatedAt: campaign.updatedAt,
      },
    };
  },
};