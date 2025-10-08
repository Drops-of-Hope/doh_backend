import { prisma } from '../config/db.js';

export const BloodTestRepository = {
  // Get all blood tests pending for a specific inventory
  async findAll(inventoryId: string) {
    return prisma.blood.findMany({
      where: {
        inventoryId,
        status: 'PENDING',
      },
      include: {
        bloodDonation: {
          include: {
            user: true, // Include user details related to this donation
          },
        },
      },
    });
  },

  // Get a single blood unit by its ID
  async findById(bloodId: string) {
    return prisma.blood.findUnique({
      where: {
        id: bloodId, 
      },
      include: {
        bloodDonation: {
          include: {
            user: true, 
          },
        },
      },
    });
  },

  
};
