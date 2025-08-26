import { Request, Response } from "express";
import { DonationsService } from "../services/donations.service.js";
import { DonationFormData, CreateDonationFormInput } from "../types/index.js";

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
};
