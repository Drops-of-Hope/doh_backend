import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Validates if a user has a DONATION_ELIGIBLE notification for a specific campaign
 * within the campaign's time window
 */
export async function validateDonationEligibleNotification(
  userId: string,
  campaignId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Get campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    if (!campaign) {
      return { valid: false, reason: "Campaign not found" };
    }

    // Find DONATION_ELIGIBLE notification for this user and campaign
    // that was created within the campaign's time window
    const notification = await prisma.notification.findFirst({
      where: {
        userId,
        type: "DONATION_ELIGIBLE",
        metadata: {
          path: ["campaignId"],
          equals: campaignId,
        },
        createdAt: {
          gte: campaign.startTime,
          lte: campaign.endTime,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!notification) {
      return {
        valid: false,
        reason: "No valid DONATION_ELIGIBLE notification found for this campaign within the campaign time window",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating donation eligible notification:", error);
    return { valid: false, reason: "Error validating notification" };
  }
}

/**
 * Validates if a user's attendance was marked for a specific campaign
 */
export async function validateCampaignAttendance(
  userId: string,
  campaignId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const participation = await prisma.campaignParticipation.findFirst({
      where: {
        userId,
        campaignId,
        attendanceMarked: true,
      },
    });

    if (!participation) {
      return {
        valid: false,
        reason: "Attendance not marked for this campaign",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating campaign attendance:", error);
    return { valid: false, reason: "Error validating attendance" };
  }
}
