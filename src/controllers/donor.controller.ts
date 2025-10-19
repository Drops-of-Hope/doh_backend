import { Request, Response } from "express";
import DonorService from "../services/donor.service.js";

export const DonorController = {
  getDonors: async (req: Request, res: Response): Promise<void> => {
    try {
      const donors = await DonorService.getAllDonors();
      res.status(200).json({ message: "Success", data: donors });
    } catch (error) {
      console.error("Error fetching donors:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  getDailyDonations: async (req: Request, res: Response): Promise<void> => {
    try {
      const daysParam = req.query.days;
      const days = daysParam ? Number(daysParam) : 30;
      const data = await DonorService.getDailyDonations(days);
      res.status(200).json({ message: "Success", data });
    } catch (error) {
      console.error("Error fetching daily donations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

export default DonorController;
