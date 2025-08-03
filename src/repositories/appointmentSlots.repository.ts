import { prisma } from "../config/db";
import { AppointmentSlot } from "../types";

export const AppointmentSlotsRepository = {
  createMany: async (slots: Omit<AppointmentSlot, "id">[]) => {
    const createdSlots = await prisma.$transaction(
      slots.map((slot) =>
        prisma.appointmentSlot.create({
          data: {
            startTime: slot.startTime,
            endTime: slot.endTime,
            tokenNumber: slot.tokenNumber,
            isAvailable: slot.isAvailable,
            medicalEstablishmentId: slot.medicalEstablishmentId,
          },
        })
      )
    );

    return createdSlots;
  },

  // Create appointment for a medical establishment
  createAppointment: async (data: {
    donorId: string;
    bdfId: string;
    appointmentDateTime: Date;
    scheduled: "PENDING" | "COMPLETED" | "CANCELLED";
  }) => {
    const { donorId, bdfId, appointmentDateTime, scheduled } = data;

    // Validate input data
    if (!donorId || !bdfId || !appointmentDateTime) {
      throw new Error(
        "Donor ID, BDF ID, and appointment date/time are required"
      );
    }

    // Create the appointment in the database
    const appointment = await prisma.appointment.create({
      data: {
        donorId,
        bdfId,
        appointmentDateTime,
        scheduled: scheduled,
      },
    });

    return appointment;
  },
};
