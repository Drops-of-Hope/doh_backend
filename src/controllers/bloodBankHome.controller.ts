import { Request, Response } from "express";
import BloodBankHomeService from "../services/bloodBankHome.service.js";

export const BloodBankHomeController = {
  // GET /blood-bank-home/counts
  async getCounts(_req: Request, res: Response): Promise<void> {
    try {
      const counts = await BloodBankHomeService.getCounts();
      res.status(200).json({ message: "Success.", ...counts });
    } catch (error) {
      console.error("Error fetching blood bank home counts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  // GET /blood-bank-home/blood-type-distribution
  async getBloodTypeDistribution(_req: Request, res: Response): Promise<void> {
    try {
      const result = await BloodBankHomeService.getBloodTypeDistribution();
      res.status(200).json({ message: "Success.", ...result });
    } catch (error) {
      console.error("Error fetching blood type distribution:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  // GET /blood-bank-home/donations-two-weeks
  async getTwoWeekDonationsStats(_req: Request, res: Response): Promise<void> {
    try {
      const result = await BloodBankHomeService.getTwoWeekDonationsStats();
      res.status(200).json({ message: "Success.", ...result });
    } catch (error) {
      console.error("Error fetching two-week donation stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

export default BloodBankHomeController;
