import { MedicalEstablishmentsRepository } from "../repositories/medicalEstablishments.repository";
//import { CreateAppointmentSlotsInput, AppointmentSlot } from '../types';

export const MedicalEstablishmentsService = {
  getMedicalEstablishments: async (district: string) => {
    return MedicalEstablishmentsRepository.getMedicalEstablishmentsByDistrict(
      district
    );
  },

  getSlots: async (establishmentId: string, date: string) => {
    // Validate date format if necessary
    if (isNaN(Date.parse(date))) {
      throw new Error("Invalid date format");
    }

    return MedicalEstablishmentsRepository.getAvailableSlots(establishmentId, date);
  },
};
