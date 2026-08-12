-- AlterTable
ALTER TABLE "BloodDonation" ADD COLUMN     "emergencyRequestId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emergencyResponderBadge" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "BloodDonation" ADD CONSTRAINT "BloodDonation_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "EmergencyRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
