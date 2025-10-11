import { DonationFormRepository } from "../repositories/donationForm.repository.js";

export const DonationFormService = {
  getDonationFormsByAppointmentId: DonationFormRepository.findByAppointmentId,
};
