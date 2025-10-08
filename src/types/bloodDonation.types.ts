export interface CreateBloodDonationInput {
  bdfId: string;
  userId: string;
  numberOfDonations: number;
  pointsEarned: number;
  startTime: Date;
  endTime: Date;
  bloodUnits: Array<{
    id: string;
    inventoryId: string | null;
    status: 'PENDING';
    volume: number;
    bagType: 'S';
    expiryDate: Date;
    consumed: boolean;
    disposed: boolean;
  }>;
}