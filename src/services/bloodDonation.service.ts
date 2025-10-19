import { BloodDonationRepository } from "../repositories/bloodDonation.repository.js";

export const BloodDonationService = {
  createBloodDonation: async (data: {
    bdfId: string;
    userId: string;
    numberOfDonations: number;
    pointsEarned: number;
    startTime: Date;
    endTime: Date;
    bloodUnits: Array<{
      id: string;
      inventoryId?: string;
      volume: number;
    }>;
  }) => {
    // Calculate expiry date (35 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 35);

    // Process blood units with expiry date and bag type
    const processedBloodUnits = data.bloodUnits.map((unit) => ({
      id: unit.id,
      inventoryId: unit.inventoryId || null,
      status: "PENDING" as const,
      volume: unit.volume,
      bagType: "S" as const,
      expiryDate: expiryDate,
      consumed: false,
      disposed: false,
    }));

    // Call repository with processed data
    return await BloodDonationRepository.create({
      bdfId: data.bdfId,
      userId: data.userId,
      numberOfDonations: data.numberOfDonations,
      pointsEarned: data.pointsEarned,
      startTime: data.startTime,
      endTime: data.endTime,
      bloodUnits: processedBloodUnits,
    });
  },

  // Get all blood donations with user details
  getAllDonationsWithUser: async () => {
    return await BloodDonationRepository.findAllWithUser();
  },
};
