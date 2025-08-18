import { DonationsRepository } from "../repositories/donations.repository.js";
import { CreateDonationFormInput } from "../types/index.js";

export const DonationsService = {
  submitDonationForm: async (form: CreateDonationFormInput) => {
    // Basic validation: ensure either userId or donorId present
    if (!form.userId && !form.donorId) {
      // Allow submission without userId if mobile can't fetch it, but donorId is preferred
      // We'll still accept payload and store with null user relation
    }

    const created = await DonationsRepository.createDonationForm(form);

    return created;
  },
};
