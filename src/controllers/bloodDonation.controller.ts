import { Request, Response, RequestHandler } from "express";
import { BloodDonationService } from "../services/bloodDonation.service.js";
import { UserService } from "../services/user.service.js";
import { prisma } from "../config/db.js";

const EMERGENCY_LINK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// If the client didn't explicitly tag this donation to an emergency, fall back
// to the donor's most recent response to a still-relevant emergency request
// (so the "accepted and successfully donated" condition can be detected without
// requiring every donation-recording UI to be emergency-aware).
async function resolveEmergencyRequestId(
  userId: string,
  explicitEmergencyRequestId?: string
): Promise<string | undefined> {
  if (explicitEmergencyRequestId) {
    return explicitEmergencyRequestId;
  }

  const recentResponse = await prisma.emergencyResponse.findFirst({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - EMERGENCY_LINK_WINDOW_MS) },
      emergencyRequest: {
        status: { in: ["ACTIVE", "FULFILLED"] },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return recentResponse?.emergencyRequestId;
}

export const BloodDonationController = {
  add: (async (req: Request, res: Response) => {
    try {
      const { bdfId, userId, startTime, endTime, bloodUnits, emergencyRequestId: explicitEmergencyRequestId } = req.body;

      if (
        !bdfId ||
        !userId ||
        !startTime ||
        !endTime ||
        !bloodUnits ||
        !Array.isArray(bloodUnits)
      ) {
        res.status(400).json({
          success: false,
          message:
            "Missing required fields: bdfId, userId, startTime, endTime, and bloodUnits array are required",
        });
        return;
      }

      const pointsEarned = 10;
      const emergencyRequestId = await resolveEmergencyRequestId(userId, explicitEmergencyRequestId);

      const result = await BloodDonationService.createBloodDonation({
        bdfId,
        userId,
        numberOfDonations: 1,
        pointsEarned,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        emergencyRequestId,
        bloodUnits,
      });

      // Update the donor's stats/badges (donor tier + Emergency Responder badge
      // when applicable) now that the donation is on record.
      let statsUpdate;
      try {
        statsUpdate = await UserService.updateDonationStats(userId, pointsEarned, undefined, emergencyRequestId);
      } catch (error) {
        console.error("Error updating donation stats after blood donation:", error);
        // Don't fail the donation record if the stats update fails
      }

      res.status(201).json({
        success: true,
        message: "Blood donation recorded successfully",
        data: { ...result, statsUpdate },
      });
    } catch (error: unknown) {
      console.error("Error in BloodDonationController.add:", error);
      res.status(500).json({
        success: false,
        message: "Failed to record blood donation",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }) as RequestHandler,

  // GET /blood-donations - retrieve all donations with user details
  getAll: (async (_req: Request, res: Response) => {
    try {
      const donations = await BloodDonationService.getAllDonationsWithUser();
      res.status(200).json({
        success: true,
        data: donations,
      });
    } catch (error: unknown) {
      console.error("Error in BloodDonationController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve blood donations",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }) as RequestHandler,
};
