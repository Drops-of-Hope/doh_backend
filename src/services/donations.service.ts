import { DonationsRepository } from "../repositories/donations.repository.js";
import { CreateDonationFormInput } from "../types/index.js";
import { prisma } from "../config/db.js";

export const DonationsService = {
  submitDonationForm: async (form: CreateDonationFormInput) => {
    if (!form.userId && !form.donorId) {
      // Still allow storing even if IDs are missing
      // You might log a warning or handle defaults here
    }

    // Validate appointmentId if provided
    if (form.appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: form.appointmentId },
      });

      if (!appointment) {
        throw new Error(`Appointment with ID ${form.appointmentId} not found`);
      }
    }

    const created = await DonationsRepository.createDonationForm(form);
    return created;
  },

  // Get donation form by ID
  getDonationFormById: async (id: string) => {
    const donationForm = await DonationsRepository.findDonationFormById(id);
    return donationForm;
  },
};
