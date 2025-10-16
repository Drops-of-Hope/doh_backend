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
  // Get available slots for a specific date and establishment
  getAvailableSlots: async (establishmentId: string, date?: string) => {
    console.log(`Getting available slots for establishment ${establishmentId} on date ${date}`);
    
    const slots = await prisma.appointmentSlot.findMany({
      where: {
        medicalEstablishmentId: establishmentId,
        isAvailable: true,
      },
      include: {
        appointments: date ? {
          where: {
            appointmentDate: {
              gte: new Date(date + 'T00:00:00.000Z'),
              lt: new Date(date + 'T23:59:59.999Z'),
            },
          },
        } : false,
      },
    });

    console.log(`Found ${slots.length} total slots for establishment`);

    // Filter slots based on date-specific availability
    if (date) {
      const availableSlots = slots.filter(slot => {
        const appointmentsOnDate = slot.appointments?.length || 0;
        const isAvailable = appointmentsOnDate < slot.donorsPerSlot;
        console.log(`Slot ${slot.id} (${slot.startTime}-${slot.endTime}): ${appointmentsOnDate}/${slot.donorsPerSlot} booked, available: ${isAvailable}`);
        return isAvailable;
      }).map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        donorsPerSlot: slot.donorsPerSlot,
        isAvailable: slot.isAvailable,
        medicalEstablishmentId: slot.medicalEstablishmentId,
        availableCapacity: slot.donorsPerSlot - (slot.appointments?.length || 0),
      }));
      
      console.log(`Returning ${availableSlots.length} available slots for date ${date}`);
      return availableSlots;
    }

    // Return all available slots if no date specified (backward compatibility)
    return slots.map(slot => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      donorsPerSlot: slot.donorsPerSlot,
      isAvailable: slot.isAvailable,
      medicalEstablishmentId: slot.medicalEstablishmentId,
    }));
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