import { Request, Response } from "express";
import { DonationsService } from "../services/donations.service.js";
import { DonationFormData, CreateDonationFormInput } from "../types/index.js";
import { PrismaClient } from "@prisma/client";

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

export const DonationsController = {
  submitDonationForm: async (req: Request, res: Response): Promise<void> => {
    try {
      const form: DonationFormData = req.body;

      if (!form) {
        res.status(400).json({ message: "Donation form data is required" });
        return;
      }

      const input: CreateDonationFormInput = {
        ...form,
        dateTime: form.dateTime ? new Date(form.dateTime) : undefined,
      };

      const created = await DonationsService.submitDonationForm(input);

      res.status(201).json({ message: "Donation form submitted", data: created });
    } catch (error) {
      console.error("Error submitting donation form:", error);
      res.status(500).json({ 
        message: "Failed to submit donation form", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  },

  // Get donation form by ID
  getDonationFormById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Donation form ID is required" });
        return;
      }

      const donationForm = await DonationsService.getDonationFormById(id);

      if (!donationForm) {
        res.status(404).json({ message: "Donation form not found" });
        return;
      }

      res.status(200).json({ data: donationForm });
    } catch (error) {
      console.error("Error retrieving donation form:", error);
      res.status(500).json({ 
        message: "Failed to retrieve donation form", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  },

  // POST /donations/form (authenticated)
  submitAuthenticatedDonationForm: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const form: DonationFormData = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to submit donation form",
        });
        return;
      }

      if (!form) {
        res.status(400).json({
          success: false,
          error: "Missing form data",
          message: "Donation form data is required",
        });
        return;
      }

      const input: CreateDonationFormInput = {
        ...form,
        donorId: userId,
        appointmentId: form.appointmentId, // Pass through the optional appointmentId
        dateTime: form.dateTime ? new Date(form.dateTime) : new Date(),
      };

      const created = await DonationsService.submitDonationForm(input);

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      console.error("Error submitting authenticated donation form:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to submit donation form",
      });
    }
  },

  // GET /donations/history
  getDonationHistory: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access donation history",
        });
        return;
      }

      const bloodDonations = await prisma.bloodDonation.findMany({
        where: { userId },
        orderBy: { endTime: "desc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          pointsEarned: true,
          numberOfDonations: true,
        },
      });

      res.status(200).json({
        data: bloodDonations,
      });
    } catch (error) {
      console.error("Error getting donation history:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get donation history",
      });
    }
  },

  // GET /donations/history/by-donor?donorId=...
  getPastDonationsByDonor: async (req: Request, res: Response): Promise<void> => {
    try {
      const { donorId } = req.query as Record<string, string | undefined>;
      if (!donorId) {
        res.status(400).json({ message: "donorId is required" });
        return;
      }
      const data = await DonationsService.getPastDonationsByDonor(donorId);
      res.status(200).json({ data });
    } catch (error) {
      console.error("Error getting past donations by donor:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
