import { prisma } from '../config/db.js';
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

  getAllMedicalEstablishments: async () => {
    const establishments = await prisma.medicalEstablishment.findMany({
      orderBy: {
        name: 'asc'
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
    // without date components. As a result, getAvailableSlots cannot filter slots by date,
    // and will return all available slots for the given establishment regardless of date.
    // To support date filtering, the schema should be updated to use DateTime fields or add
    // a separate date field, and this function should be modified to accept a date parameter
    // and filter slots accordingly.
    return availableSlots;
  },

  getInventoryByEstablishmentId: async (establishmentId: string) => {
    const inventory = await prisma.inventory.findMany({
      where: {
        EstablishmentId: establishmentId,
      },
      include: {
        blood: true,       // Include all blood units in this inventory
        bloodTests: true,  // Include all blood tests related to this inventory
        medicalEstablishment: true, // Include establishment info if needed
      },
    });

    return inventory;
  },

};