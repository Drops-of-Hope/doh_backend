import { prisma } from '../config/db';
//import { MedicalEstablishment } from '../types';

export const MedicalEstablishmentsRepository = {
  getMedicalEstablishmentsByDistrict: async (district: string) => {
    const establishments = await prisma.medicalEstablishment.findMany({
      where: {
        region: district
      }
    });
    return establishments;
  },

  // getUpcomingDates: async (establishmentId: string) => {
  //   const today = new Date();
  //   const upcomingDates = Array.from({ length: 7 }, (_, i) => {
  //     const date = new Date(today);
  //     date.setDate(today.getDate() + i);
  //     return date;
  //   });
    
  //   return upcomingDates;
  // },
  //needs to check if date is valid, isAvailable true slots,
  getAvailableSlots: async (establishmentId: string) => {
    const availableSlots = await prisma.appointmentSlot.findMany({
      where: {
        medicalEstablishmentId: establishmentId,
        isAvailable: true,
      }
    });
    // Note: The current schema stores startTime/endTime as strings (HH:MM format)
    // without date components. To filter by date, the schema would need to be updated
    // to use DateTime fields or add a separate date field.
    return availableSlots;
  },

};