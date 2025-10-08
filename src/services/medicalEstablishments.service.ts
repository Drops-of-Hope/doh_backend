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

  getInventory: async (establishmentId: string) => {
    // Basic validation (optional here since controller already validates)
    if (!establishmentId) {
      throw new Error("Establishment ID is required");
    }

    // Delegate to repository layer
    const inventory =
      await MedicalEstablishmentsRepository.getInventoryByEstablishmentId(
        establishmentId
      );

    return inventory;
  },
};
