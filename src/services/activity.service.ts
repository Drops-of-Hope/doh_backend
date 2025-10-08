// Activity service for creating and managing user activities
import { prisma } from "../config/db.js";
import { ActivityType, Prisma } from "@prisma/client";

export interface CreateActivityInput {
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}

export const ActivityService = {
  // Create a new activity
  async createActivity(input: CreateActivityInput) {
    try {
      const activity = await prisma.activity.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          description: input.description,
          metadata: input.metadata || {},
          isRead: false,
          createdAt: new Date(),
        },
      });

      return activity;
    } catch (error) {
      console.error("Error creating activity:", error);
      throw new Error("Failed to create activity");
    }
  },

  // Create donation completed activity
  async createDonationActivity(userId: string, donationData: {
    campaignTitle?: string;
    location?: string;
    bloodType?: string;
    volume?: number;
    pointsEarned?: number;
  }) {
    return this.createActivity({
      userId,
      type: "DONATION_COMPLETED",
      title: `Blood donation completed${donationData.campaignTitle ? ` - ${donationData.campaignTitle}` : ""}`,
      description: `Successfully donated ${donationData.volume || 450}ml of ${donationData.bloodType || "blood"} at ${donationData.location || "blood bank"}. Earned ${donationData.pointsEarned || 100} points.`,
      metadata: {
        location: donationData.location,
        bloodType: donationData.bloodType,
        volume: donationData.volume || 450,
        pointsEarned: donationData.pointsEarned || 100,
        campaignTitle: donationData.campaignTitle,
      },
    });
  },

  // Create appointment scheduled activity
  async createAppointmentActivity(userId: string, appointmentData: {
    appointmentDate: string;
    location: string;
    hospital: string;
    appointmentId: string;
  }) {
    return this.createActivity({
      userId,
      type: "APPOINTMENT_SCHEDULED",
      title: "Blood donation appointment scheduled",
      description: `Appointment scheduled for ${appointmentData.appointmentDate} at ${appointmentData.hospital}, ${appointmentData.location}.`,
      metadata: {
        appointmentDate: appointmentData.appointmentDate,
        location: appointmentData.location,
        hospital: appointmentData.hospital,
        appointmentId: appointmentData.appointmentId,
      },
    });
  },

  // Create campaign joined activity
  async createCampaignJoinedActivity(userId: string, campaignData: {
    campaignId: string;
    campaignTitle: string;
    location: string;
    date: string;
  }) {
    return this.createActivity({
      userId,
      type: "CAMPAIGN_JOINED",
      title: `Joined campaign: ${campaignData.campaignTitle}`,
      description: `Successfully registered for ${campaignData.campaignTitle} on ${campaignData.date} at ${campaignData.location}.`,
      metadata: {
        campaignId: campaignData.campaignId,
        campaignTitle: campaignData.campaignTitle,
        location: campaignData.location,
        date: campaignData.date,
      },
    });
  },

  // Create badge earned activity
  async createBadgeEarnedActivity(userId: string, badgeData: {
    oldBadge: string;
    newBadge: string;
    totalDonations: number;
  }) {
    return this.createActivity({
      userId,
      type: "BADGE_EARNED",
      title: `Badge upgraded to ${badgeData.newBadge}!`,
      description: `Congratulations! You've been promoted from ${badgeData.oldBadge} to ${badgeData.newBadge} donor after ${badgeData.totalDonations} donations.`,
      metadata: {
        oldBadge: badgeData.oldBadge,
        newBadge: badgeData.newBadge,
        totalDonations: badgeData.totalDonations,
      },
    });
  },

  // Create points earned activity
  async createPointsEarnedActivity(userId: string, pointsData: {
    pointsEarned: number;
    totalPoints: number;
    reason: string;
  }) {
    return this.createActivity({
      userId,
      type: "POINTS_EARNED",
      title: `Earned ${pointsData.pointsEarned} points`,
      description: `${pointsData.reason}. Total points: ${pointsData.totalPoints}`,
      metadata: {
        pointsEarned: pointsData.pointsEarned,
        totalPoints: pointsData.totalPoints,
        reason: pointsData.reason,
      },
    });
  },

  // Create QR scan activity
  async createQRScanActivity(userId: string, scanData: {
    campaignTitle: string;
    scanType: string;
    location: string;
  }) {
    return this.createActivity({
      userId,
      type: "QR_SCANNED",
      title: `QR code scanned - ${scanData.campaignTitle}`,
      description: `${scanData.scanType} QR scan completed at ${scanData.location}.`,
      metadata: {
        campaignTitle: scanData.campaignTitle,
        scanType: scanData.scanType,
        location: scanData.location,
      },
    });
  },

  // Get user activities with filtering
  async getUserActivities(userId: string, options: {
    limit?: number;
    offset?: number;
    type?: ActivityType;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const { limit = 10, offset = 0, type, startDate, endDate } = options;

    const where: Prisma.ActivityWhereInput = { userId };

    if (type) {
      where.type = type;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.activity.count({ where });

    return {
      activities,
      total,
      hasMore: total > offset + activities.length,
    };
  },

  // Mark activities as read
  async markActivitiesAsRead(userId: string, activityIds: string[]) {
    return prisma.activity.updateMany({
      where: {
        id: { in: activityIds },
        userId,
      },
      data: {
        isRead: true,
      },
    });
  },

  // Get activity statistics
  async getActivityStats(userId: string) {
    const [
      totalActivities,
      unreadActivities,
      recentActivities,
      donationActivities,
      appointmentActivities,
    ] = await Promise.all([
      prisma.activity.count({ where: { userId } }),
      prisma.activity.count({ where: { userId, isRead: false } }),
      prisma.activity.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.activity.count({ where: { userId, type: "DONATION_COMPLETED" } }),
      prisma.activity.count({ where: { userId, type: "APPOINTMENT_SCHEDULED" } }),
    ]);

    return {
      totalActivities,
      unreadActivities,
      recentActivities,
      donationActivities,
      appointmentActivities,
    };
  },
};

export default ActivityService;