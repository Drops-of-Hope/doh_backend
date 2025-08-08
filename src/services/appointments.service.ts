import { AppointmentsRepository } from "../repositories/appointments.repository.js";
import { CreateAppointmentsInput } from "../types/index.js";

export const AppointmentsService = {
  createAppointment: async (data: CreateAppointmentsInput) => {
    const { donorId, slotId, appointmentDate } = data;

    // 1. Check if donor exists
    const donorExists = await AppointmentsRepository.checkUserExists(donorId);
    if (!donorExists) {
      throw new Error("Donor not found");
    }

    // 2. Check if donor is eligible to donate
    const isEligible = await AppointmentsRepository.checkUserEligibility(donorId);
    if (!isEligible) {
      throw new Error("Donor is not eligible to donate at this time");
    }

    // 3. Check if slot is available
    const isSlotAvailable = await AppointmentsRepository.checkSlotAvailability(slotId);
    if (!isSlotAvailable) {
      throw new Error("Selected time slot is not available");
    }

    // 4. Create the appointment
    const appointment = await AppointmentsRepository.createAppointment({
      donorId,
      slotId,
      appointmentDate,
      scheduled: "PENDING",
    });

    return appointment;
  },

  getAppointmentById: async (appointmentId: string) => {
    return await AppointmentsRepository.getAppointmentById(appointmentId);
  },

  // Helper method to calculate next eligible date (typically 56 days after donation)
  calculateNextEligibleDate: (donationDate: Date): Date => {
    const nextEligible = new Date(donationDate);
    nextEligible.setDate(nextEligible.getDate() + 56); // 8 weeks
    return nextEligible;
  },
};