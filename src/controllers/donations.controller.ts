import { Request, Response } from "express";
import { DonationsService } from "../services/donations.service.js";
import { DonationFormData, CreateDonationFormInput } from "../types/index.js";

export const DonationsController = {
  submitDonationForm: async (req: Request, res: Response): Promise<void> => {
    try {
      const form: DonationFormData = req.body;

      // Basic server-side validation
      if (!form) {
        res.status(400).json({ message: "Donation form data is required" });
        return;
      }

      // Ensure dateTime is a Date for the service input
      const input: CreateDonationFormInput = {
        ...form,
        dateTime: form.dateTime ? new Date(form.dateTime) : undefined,
      };

      const created = await DonationsService.submitDonationForm(input);

      res.status(201).json({ message: "Donation form submitted", data: created });
    } catch (error) {
      console.error("Error submitting donation form:", error);
      res.status(500).json({ message: "Failed to submit donation form", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
