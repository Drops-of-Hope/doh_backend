import { MedicalEstablishmentsRepository } from "../repositories/medicalEstablishments.repository.js";
//import { CreateAppointmentSlotsInput, AppointmentSlot } from '../types';

export const MedicalEstablishmentsService = {
  getMedicalEstablishments: async (district: string) => {
    return MedicalEstablishmentsRepository.getMedicalEstablishmentsByDistrict(
      district
    );
  },

  getAllMedicalEstablishments: async () => {
    return MedicalEstablishmentsRepository.getAllMedicalEstablishments();
  },

  getSlots: async (establishmentId: string, date: string) => {
    // Validate date format if necessary
    if (isNaN(Date.parse(date))) {
      throw new Error("Invalid date format");
    }

    return MedicalEstablishmentsRepository.getAvailableSlots(establishmentId);
  },
};
