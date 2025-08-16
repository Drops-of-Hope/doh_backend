import { prisma } from "../config/db.js";
import { AppointmentSlot } from "../types/index.js";

export const AppointmentSlotsRepository = {
  createMany: async (slots: Omit<AppointmentSlot, "id">[]) => {
    const createdSlots = await prisma.$transaction(
      slots.map(slot =>
        prisma.appointmentSlot.create({
          data: {
            startTime: slot.startTime,
            endTime: slot.endTime,
            donorsPerSlot: slot.donorsPerSlot,
            isAvailable: slot.isAvailable,
            medicalEstablishmentId: slot.medicalEstablishmentId,
          },
        })
      )
    );
    
    return createdSlots;
  },

  getAvailableSlots: async (
    medicalEstablishmentId: string
  ): Promise<AppointmentSlot[]> => {
    const slots = await prisma.appointmentSlot.findMany({
      where: {
        medicalEstablishmentId: medicalEstablishmentId,
        isAvailable: true,
      },
    });

    return slots;
  },

  // Create appointment for a medical establishment
  createAppointment: async (data: {
    donorId: string;
    appointmentDateTime: Date;
    scheduled: "PENDING" | "COMPLETED" | "CANCELLED";
    slotId: string;
    medicalEstablishmentId: string;
  }) => {
    const { donorId, appointmentDateTime, scheduled, slotId, medicalEstablishmentId } = data;

    // Validate input data
  if (!donorId || !appointmentDateTime || !slotId || !medicalEstablishmentId) {
      throw new Error(
    "Donor ID, slot ID, medical establishment ID and appointment date/time are required"
      );
    }

    // Create the appointment in the database
    const appointment = await prisma.appointment.create({
      data: {
    donorId,
    appointmentDate: appointmentDateTime,
    scheduled: scheduled,
    slotId,
    medicalEstablishmentId,
      },
    });

    return appointment;
  },

  getByMedicalEstablishmentId: async (medicalEstablishmentId: string) => {
    const slots = await prisma.appointmentSlot.findMany({
      where: {
        medicalEstablishmentId,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return slots;
  },
};