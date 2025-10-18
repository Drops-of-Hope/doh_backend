import { Request, Response } from "express";
import BloodTransitService from "../services/bloodTransit.service.js";

export const BloodTransitController = {
  getTransitRequests: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodBankId, hospitalId } = req.query as Record<string, string | undefined>;

      if (!bloodBankId && !hospitalId) {
        res.status(400).json({ message: "bloodBankId or hospitalId query parameter is required" });
        return;
      }

      const data = await BloodTransitService.getTransitRequests({ bloodBankId, hospitalId });

      res.status(200).json({ message: "Success", data });
    } catch (error) {
      console.error("Error fetching transit requests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

export default BloodTransitController;
