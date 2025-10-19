import { prisma } from "../config/db.js";
import { CreateBloodDonationInput } from "../types/index.js";

export const BloodDonationRepository = {
  create: async (data: CreateBloodDonationInput) => {
    return await prisma.$transaction(async (tx) => {
      // Create the blood donation record
      const bloodDonation = await tx.bloodDonation.create({
        data: {
          bdfId: data.bdfId,
          userId: data.userId,
          numberOfDonations: data.numberOfDonations,
          pointsEarned: data.pointsEarned,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      });

      // Create blood units
      const bloodUnits = await Promise.all(
        data.bloodUnits.map(
          (unit: {
            id: string;
            inventoryId: string | null;
            status: "PENDING";
            volume: number;
            bagType: "S";
            expiryDate: Date;
            consumed: boolean;
            disposed: boolean;
          }) =>
            tx.blood.create({
              data: {
                id: unit.id,
                donationId: bloodDonation.id,
                inventoryId: unit.inventoryId,
                status: unit.status,
                volume: unit.volume,
                bagType: unit.bagType,
                expiryDate: unit.expiryDate,
                consumed: unit.consumed,
                disposed: unit.disposed,
              },
            })
        )
      );

      // Create system log
      const systemLog = await tx.systemLog.create({
        data: {
          dateTime: new Date(),
          level: "INFO",
          message: "Blood unit has been added from donation",
          bloodDonationId: bloodDonation.id,
        },
      });

      return {
        bloodDonation,
        bloodUnits,
        systemLog,
      };
    });
  },

  // Retrieve all blood donations with related user details
  findAllWithUser: async () => {
    return await prisma.bloodDonation.findMany({
      orderBy: { endTime: "desc" },
      include: {
        user: {
          include: {
            userDetails: true,
          },
        },
      },
    });
  },
};
