/*
  Warnings:

  - The `isApproved` column on the `Campaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "BloodTest" ALTER COLUMN "hivTest" DROP NOT NULL,
ALTER COLUMN "syphilis" DROP NOT NULL,
ALTER COLUMN "hepatitisB" DROP NOT NULL,
ALTER COLUMN "hepatitisC" DROP NOT NULL,
ALTER COLUMN "malaria" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "isApproved",
ADD COLUMN     "isApproved" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "DevicePushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthVital" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "weight" TEXT NOT NULL,
    "bp" TEXT NOT NULL,
    "cvsPulse" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthVital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "unitsRequired" INTEGER NOT NULL,
    "urgencyLevel" "UrgencyLevel" NOT NULL,
    "requestReason" TEXT NOT NULL,
    "requestDeliveryDate" TIMESTAMP(3) NOT NULL,
    "requestDeliveryTime" TEXT NOT NULL,
    "medicalEstablishmentId" TEXT NOT NULL,
    "requestingBloodBankId" TEXT,
    "additionalNotes" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevicePushToken_token_key" ON "DevicePushToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "HealthVital_appointmentId_key" ON "HealthVital"("appointmentId");

-- AddForeignKey
ALTER TABLE "DevicePushToken" ADD CONSTRAINT "DevicePushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthVital" ADD CONSTRAINT "HealthVital_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthVital" ADD CONSTRAINT "HealthVital_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_medicalEstablishmentId_fkey" FOREIGN KEY ("medicalEstablishmentId") REFERENCES "MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requestingBloodBankId_fkey" FOREIGN KEY ("requestingBloodBankId") REFERENCES "BloodBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
