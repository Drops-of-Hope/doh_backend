/*
  Warnings:

  - You are about to drop the column `appointmentDateTime` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `bdfId` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `tokenNumber` on the `AppointmentSlot` table. All the data in the column will be lost.
  - The `type` column on the `UserDetail` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `appointmentDate` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medicalEstablishmentId` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slotId` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `donorsPerSlot` to the `AppointmentSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `district` on the `UserDetail` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."DonationBadge" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('DONOR', 'STAFF', 'ADMIN', 'CAMP_ORGANIZER', 'MEDICAL_OFFICER');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('DONATION_COMPLETED', 'APPOINTMENT_SCHEDULED', 'APPOINTMENT_CANCELLED', 'CAMPAIGN_JOINED', 'CAMPAIGN_COMPLETED', 'QR_SCANNED', 'BADGE_EARNED', 'POINTS_EARNED', 'EMERGENCY_RESPONDED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'CAMPAIGN_INVITATION', 'EMERGENCY_ALERT', 'DONATION_ELIGIBLE', 'BADGE_EARNED', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."ParticipationStatus" AS ENUM ('REGISTERED', 'CONFIRMED', 'ATTENDED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."QRScanType" AS ENUM ('CAMPAIGN_ATTENDANCE', 'DONATION_VERIFICATION', 'CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "public"."UrgencyLevel" AS ENUM ('CRITICAL', 'HIGH', 'MODERATE', 'LOW');

-- CreateEnum
CREATE TYPE "public"."EmergencyStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_bdfId_fkey";

-- DropIndex
DROP INDEX "public"."Appointment_bdfId_key";

-- AlterTable
ALTER TABLE "public"."Appointment" DROP COLUMN "appointmentDateTime",
DROP COLUMN "bdfId",
ADD COLUMN     "appointmentDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "medicalEstablishmentId" TEXT NOT NULL,
ADD COLUMN     "slotId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."AppointmentSlot" DROP COLUMN "tokenNumber",
ADD COLUMN     "donorsPerSlot" INTEGER NOT NULL,
ALTER COLUMN "startTime" SET DATA TYPE TEXT,
ALTER COLUMN "endTime" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."BloodDonationForm" ADD COLUMN     "appointmentId" TEXT;

-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "actualDonors" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requirements" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "donationBadge" "public"."DonationBadge" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nextEligible" TIMESTAMP(3),
ADD COLUMN     "profileImageUrl" TEXT,
ADD COLUMN     "totalDonations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."UserDetail" ADD COLUMN     "allergies" JSONB,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "medicalConditions" JSONB,
ADD COLUMN     "phoneNumber" TEXT,
DROP COLUMN "district",
ADD COLUMN     "district" "public"."District" NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "public"."UserType" NOT NULL DEFAULT 'DONOR';

-- CreateTable
CREATE TABLE "public"."UserHomeStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nextAppointmentDate" TIMESTAMP(3),
    "nextAppointmentId" TEXT,
    "totalDonations" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "donationStreak" INTEGER NOT NULL DEFAULT 0,
    "lastDonationDate" TIMESTAMP(3),
    "eligibleToDonate" BOOLEAN NOT NULL DEFAULT true,
    "nextEligibleDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHomeStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignParticipation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."ParticipationStatus" NOT NULL DEFAULT 'REGISTERED',
    "qrCodeScanned" BOOLEAN NOT NULL DEFAULT false,
    "scannedAt" TIMESTAMP(3),
    "scannedById" TEXT,
    "attendanceMarked" BOOLEAN NOT NULL DEFAULT false,
    "donationCompleted" BOOLEAN NOT NULL DEFAULT false,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "feedbackRating" INTEGER,

    CONSTRAINT "CampaignParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QRScan" (
    "id" TEXT NOT NULL,
    "scannerId" TEXT NOT NULL,
    "scannedUserId" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignParticipationId" TEXT,
    "scanType" "public"."QRScanType" NOT NULL,
    "scanDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "QRScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmergencyRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bloodTypesNeeded" JSONB NOT NULL,
    "quantityNeeded" JSONB NOT NULL,
    "urgencyLevel" "public"."UrgencyLevel" NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "public"."EmergencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "specialInstructions" TEXT,

    CONSTRAINT "EmergencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmergencyResponse" (
    "id" TEXT NOT NULL,
    "emergencyRequestId" TEXT NOT NULL,
    "userId" TEXT,
    "responseType" TEXT NOT NULL,
    "message" TEXT,
    "contactInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserHomeStats_userId_key" ON "public"."UserHomeStats"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserHomeStats" ADD CONSTRAINT "UserHomeStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignParticipation" ADD CONSTRAINT "CampaignParticipation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignParticipation" ADD CONSTRAINT "CampaignParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QRScan" ADD CONSTRAINT "QRScan_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QRScan" ADD CONSTRAINT "QRScan_campaignParticipationId_fkey" FOREIGN KEY ("campaignParticipationId") REFERENCES "public"."CampaignParticipation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QRScan" ADD CONSTRAINT "QRScan_scannerId_fkey" FOREIGN KEY ("scannerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "public"."Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmergencyResponse" ADD CONSTRAINT "EmergencyResponse_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "public"."EmergencyRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BloodDonationForm" ADD CONSTRAINT "BloodDonationForm_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_medicalEstablishmentId_fkey" FOREIGN KEY ("medicalEstablishmentId") REFERENCES "public"."MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."AppointmentSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
