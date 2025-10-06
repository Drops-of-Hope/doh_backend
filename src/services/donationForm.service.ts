import { DonationFormRepository } from "../repositories/donationForm.repository";

export const DonationFormService = {
  getDonationFormsByAppointmentId: DonationFormRepository.findByAppointmentId,
};
