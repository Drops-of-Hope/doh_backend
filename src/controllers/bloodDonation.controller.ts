import { Request, Response, RequestHandler } from "express";
import { BloodDonationService } from "../services/bloodDonation.service.js";

export const BloodDonationController = {
  add: (async (req: Request, res: Response) => {
    try {
      const { bdfId, userId, startTime, endTime, bloodUnits } = req.body;

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

      const result = await BloodDonationService.createBloodDonation({
        bdfId,
        userId,
        numberOfDonations: 1,
        pointsEarned: 10,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        bloodUnits,
      });

      res.status(201).json({
        success: true,
        message: "Blood donation recorded successfully",
        data: result,
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
