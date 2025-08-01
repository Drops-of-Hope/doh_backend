import { prisma } from '../config/db';
import { AppointmentSlot } from '../types';

export const AppointmentSlotsRepository = {
  createMany: async (slots: Omit<AppointmentSlot, 'id'>[]) => {
    const createdSlots = await prisma.$transaction(
      slots.map(slot => 
        prisma.appointmentSlot.create({
          data: {
            startTime: slot.startTime,
            endTime: slot.endTime,
            tokenNumber: slot.tokenNumber,
            isAvailable: slot.isAvailable,
            medicalEstablishmentId: slot.medicalEstablishmentId
          }
        })
      )
    );
    
    return createdSlots;
  },
};