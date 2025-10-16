import { AppointmentsRepository } from "../repositories/appointments.repository.js";
import { CreateAppointmentsInput } from "../types/index.js";

export const AppointmentsService = {
  createAppointment: async (data: CreateAppointmentsInput) => {
    const { donorId, slotId, appointmentDate, medicalEstablishmentId } = data;

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

    // 3. Check if slot is available for the specific date
    const isSlotAvailable = await AppointmentsRepository.checkSlotAvailability(slotId, appointmentDate);
    if (!isSlotAvailable) {
      throw new Error("Selected time slot is not available for the chosen date");
    }

    // 4. Ensure medicalEstablishmentId is provided
    if (!medicalEstablishmentId) {
      throw new Error("Medical establishment ID is required");
    }

    // 5. Create the appointment
    const appointment = await AppointmentsRepository.createAppointment({
      donorId,
      slotId,
      appointmentDate,
      medicalEstablishmentId,
      scheduled: "PENDING",
    });

    return appointment;
  },

  getAppointmentById: async (appointmentId: string) => {
    return await AppointmentsRepository.getAppointmentById(appointmentId);
  },

  // Get user's appointments by ID
  getAppointmentsByUserId: async (userId: string, status?: string) => {
    if (!userId) {
      throw new Error("User ID is required");
    }
    return await AppointmentsRepository.getAppointmentsByUserId(userId, status);
  },

  // Get all appointments for a medical establishment
  getAppointmentsByMedicalEstablishmentId: async (medicalEstablishmentId: string) => {
    if (!medicalEstablishmentId) {
      throw new Error("Medical establishment ID is required");
    }
    return await AppointmentsRepository.getAppointmentsByMedicalEstablishmentId(medicalEstablishmentId);
  },

  // Helper method to calculate next eligible date (typically 56 days after donation)
  calculateNextEligibleDate: (donationDate: Date): Date => {
    const nextEligible = new Date(donationDate);
    nextEligible.setDate(nextEligible.getDate() + 56); // 8 weeks
    return nextEligible;
  },
  updateAppointmentStatus: async (appointmentId: string, status: string) => {
    // Map incoming status strings from frontend to Prisma enum values
    const statusMap: Record<string, string> = {
      confirmed: "COMPLETED",
    };

    const mapped = statusMap[status];
    if (!mapped) throw new Error("Unsupported status");

    // Delegate to repository to perform transactional update and audit log
    return await AppointmentsRepository.updateAppointmentStatus(appointmentId, mapped);
  },
};
