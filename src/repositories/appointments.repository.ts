import { prisma } from "../config/db.js";
import { CreateAppointmentsInput } from "../types/index.js";

export const AppointmentsRepository = {
  // Create appointment for a medical establishment
  createAppointment: async (
    data: CreateAppointmentsInput & { scheduled: "PENDING" }
  ) => {
    const {
      donorId,
      slotId,
      appointmentDate,
      scheduled,
      medicalEstablishmentId,
    } = data;

    // Validate input data
    if (!donorId || !slotId || !appointmentDate || !medicalEstablishmentId) {
      throw new Error(
        "Donor ID, slot ID, appointment date, and medical establishment ID are required"
      );
    }

    // Create the appointment in the database
    const appointment = await prisma.appointment.create({
      data: {
        donorId,
        slotId,
        appointmentDate,
        scheduled,
        medicalEstablishmentId,
      },
      include: {
        donor: true,
        slot: true,
        medicalEstablishment: true, 
      },
    });

    return appointment;
  },

  // Check if user exists
  checkUserExists: async (donorId: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({
      where: { id: donorId },
    });
    return !!user;
  },

  // Check if user is eligible to donate
  checkUserEligibility: async (donorId: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({
      where: { id: donorId },
      select: { nextEligible: true },
    });

    if (!user) return false;

    // If nextEligible is null, user is eligible
    if (!user.nextEligible) return true;

    // Check if current date is after or equal to nextEligible date
    return new Date() >= user.nextEligible;
  },

  // Check if slot is available
  checkSlotAvailability: async (slotId: string): Promise<boolean> => {
    const slot = await prisma.appointmentSlot.findUnique({
      where: { id: slotId },
      select: {
        isAvailable: true,
        donorsPerSlot: true,
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!slot || !slot.isAvailable) return false;

    // Check if slot has capacity
    return slot._count.appointments < slot.donorsPerSlot;
  },

  // Get appointment by ID
  getAppointmentById: async (appointmentId: string) => {
    return await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        donor: true,
        slot: true,
        medicalEstablishment: true,
      },
    });
  },

  getAppointmentsByMedicalEstablishmentId: async (medicalEstablishmentId: string) => {
    return await prisma.appointment.findMany({
      where: { medicalEstablishmentId },
      include: {
        donor: true,
        slot: true,
        medicalEstablishment: true,
      },
    });
  },

  // Update user's next eligible date (called after appointment completion)
  updateUserNextEligible: async (
    donorId: string,
    nextEligibleDate: Date
  ) => {
    return await prisma.user.update({
      where: { id: donorId },
      data: { nextEligible: nextEligibleDate },
    });
  },
};
