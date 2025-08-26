import { DonationsRepository } from "../repositories/donations.repository.js";
import { CreateDonationFormInput } from "../types/index.js";

export const DonationsService = {
  submitDonationForm: async (form: CreateDonationFormInput) => {
    if (!form.userId && !form.donorId) {
      // Still allow storing even if IDs are missing
      // You might log a warning or handle defaults here
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
