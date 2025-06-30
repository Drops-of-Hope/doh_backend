-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'STAFF');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('FIXED', 'MOBILE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SerumStatus" AS ENUM ('DONATION', 'CONSULTED');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('TESTED', 'SAFE', 'DISCARDED', 'PENDING');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransitStatus" AS ENUM ('IN_TRANSIT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('CENTRIFUGE', 'REFRIGERATOR');

-- CreateTable
CREATE TABLE "Users" (
    "id" SERIAL NOT NULL,
    "nic" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "Role" NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDetails" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "occupation" TEXT NOT NULL,
    "whatElse" TEXT NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" SERIAL NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "profileFlag" BOOLEAN NOT NULL,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorDetails" (
    "id" SERIAL NOT NULL,
    "donorName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "donorId" INTEGER NOT NULL,

    CONSTRAINT "DonorDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodDonationForm" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "donorId" INTEGER,
    "numberOfDonations" INTEGER,
    "donated" BOOLEAN,
    "anyDifficulty" BOOLEAN NOT NULL,
    "medicalAdvice" BOOLEAN NOT NULL,
    "feelingWell" BOOLEAN NOT NULL,
    "takingMedicines" BOOLEAN NOT NULL,
    "anySurgery" BOOLEAN NOT NULL,
    "pregnant" BOOLEAN NOT NULL,
    "haveHepatitis" BOOLEAN NOT NULL,
    "tattoos" BOOLEAN NOT NULL,
    "travelledAbroad" BOOLEAN NOT NULL,
    "receivedBlood" BOOLEAN NOT NULL,
    "chemotherapy" BOOLEAN NOT NULL,
    "bookAspin" BOOLEAN NOT NULL,
    "knowledgeAgent" BOOLEAN NOT NULL,
    "feverLymphNode" BOOLEAN NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "BloodDonationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodDonation" (
    "id" SERIAL NOT NULL,
    "bdfId" INTEGER NOT NULL,
    "userId" INTEGER,
    "numberOfDonations" INTEGER,
    "pointsEarned" INTEGER NOT NULL,

    CONSTRAINT "BloodDonation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "bloodDonationId" INTEGER NOT NULL,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payments" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "location" TEXT NOT NULL,
    "donorId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "expectedDonors" INTEGER NOT NULL,
    "isApproved" BOOLEAN NOT NULL,
    "medicalEstablishmentId" INTEGER NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "donorId" INTEGER NOT NULL,
    "scheduled" "AppointmentStatus" NOT NULL,
    "serum" "SerumStatus" NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "bloodBankId" INTEGER NOT NULL,
    "lastChecked" TIMESTAMP(3) NOT NULL,
    "available" INTEGER NOT NULL,
    "expired" INTEGER NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodTest" (
    "id" SERIAL NOT NULL,
    "bloodId" INTEGER NOT NULL,
    "testDateTime" TIMESTAMP(3) NOT NULL,
    "status" "TestStatus" NOT NULL,
    "hepatitisB" BOOLEAN NOT NULL,
    "hepatitisC" BOOLEAN NOT NULL,
    "malaria" BOOLEAN NOT NULL,
    "resultPending" BOOLEAN NOT NULL,
    "appointmentId" INTEGER,
    "inventoryId" INTEGER,

    CONSTRAINT "BloodTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blood" (
    "id" SERIAL NOT NULL,
    "donationId" INTEGER NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "status" "TestStatus" NOT NULL,

    CONSTRAINT "Blood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodRequest" (
    "id" SERIAL NOT NULL,
    "requestedDateTime" TIMESTAMP(3) NOT NULL,
    "bloodType" "BloodGroup" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "bloodId" INTEGER NOT NULL,

    CONSTRAINT "BloodRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodTransit" (
    "id" SERIAL NOT NULL,
    "bloodId" INTEGER NOT NULL,
    "transitStatus" "TransitStatus" NOT NULL,
    "receiverHospitalId" INTEGER NOT NULL,
    "bloodRequestId" INTEGER,

    CONSTRAINT "BloodTransit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bloodCapacity" INTEGER NOT NULL,
    "isBloodBank" BOOLEAN NOT NULL,
    "medicalEstablishmentId" INTEGER NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodBank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bloodCapacity" INTEGER NOT NULL,
    "isBloodBank" BOOLEAN NOT NULL,
    "medicalEstablishmentId" INTEGER NOT NULL,

    CONSTRAINT "BloodBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEstablishment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bloodCapacity" INTEGER NOT NULL,
    "isBloodBank" BOOLEAN NOT NULL,

    CONSTRAINT "MedicalEstablishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" SERIAL NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "serialNumber" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "locatedMedEstId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAssignment" (
    "id" SERIAL NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "assignmentStartDate" TIMESTAMP(3) NOT NULL,
    "assignmentEndDate" TIMESTAMP(3),
    "assignedById" INTEGER NOT NULL,

    CONSTRAINT "EquipmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationSchedule" (
    "id" SERIAL NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "calibrationFrequency" TEXT NOT NULL,
    "nextCalibrationDate" TIMESTAMP(3) NOT NULL,
    "alertBeforeDays" INTEGER,

    CONSTRAINT "CalibrationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationLog" (
    "id" SERIAL NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "calibrationDate" TIMESTAMP(3) NOT NULL,
    "performedById" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CalibrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" SERIAL NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "maintenanceDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "performedById" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consumables" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "stockLevel" INTEGER NOT NULL,
    "minimumStockLevel" INTEGER NOT NULL,
    "locatedMedEstId" INTEGER NOT NULL,

    CONSTRAINT "Consumables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumableAllocation" (
    "id" SERIAL NOT NULL,
    "consumableId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "allocationDate" TIMESTAMP(3) NOT NULL,
    "allocatedById" INTEGER NOT NULL,

    CONSTRAINT "ConsumableAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "roleInCampaign" TEXT NOT NULL,
    "assignmentStartDate" TIMESTAMP(3) NOT NULL,
    "assignmentEndDate" TIMESTAMP(3),

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_nic_key" ON "Users"("nic");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserDetails_userId_key" ON "UserDetails"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DonorDetails_donorId_key" ON "DonorDetails"("donorId");

-- CreateIndex
CREATE UNIQUE INDEX "BloodDonation_bdfId_key" ON "BloodDonation"("bdfId");

-- AddForeignKey
ALTER TABLE "UserDetails" ADD CONSTRAINT "UserDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorDetails" ADD CONSTRAINT "DonorDetails_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodDonationForm" ADD CONSTRAINT "BloodDonationForm_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodDonationForm" ADD CONSTRAINT "BloodDonationForm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodDonation" ADD CONSTRAINT "BloodDonation_bdfId_fkey" FOREIGN KEY ("bdfId") REFERENCES "BloodDonationForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodDonation" ADD CONSTRAINT "BloodDonation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_bloodDonationId_fkey" FOREIGN KEY ("bloodDonationId") REFERENCES "BloodDonation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_medicalEstablishmentId_fkey" FOREIGN KEY ("medicalEstablishmentId") REFERENCES "MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_bloodBankId_fkey" FOREIGN KEY ("bloodBankId") REFERENCES "BloodBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTest" ADD CONSTRAINT "BloodTest_bloodId_fkey" FOREIGN KEY ("bloodId") REFERENCES "Blood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTest" ADD CONSTRAINT "BloodTest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTest" ADD CONSTRAINT "BloodTest_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blood" ADD CONSTRAINT "Blood_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "BloodDonation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_bloodId_fkey" FOREIGN KEY ("bloodId") REFERENCES "Blood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransit" ADD CONSTRAINT "BloodTransit_bloodId_fkey" FOREIGN KEY ("bloodId") REFERENCES "Blood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransit" ADD CONSTRAINT "BloodTransit_receiverHospitalId_fkey" FOREIGN KEY ("receiverHospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransit" ADD CONSTRAINT "BloodTransit_bloodRequestId_fkey" FOREIGN KEY ("bloodRequestId") REFERENCES "BloodRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospital" ADD CONSTRAINT "Hospital_medicalEstablishmentId_fkey" FOREIGN KEY ("medicalEstablishmentId") REFERENCES "MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodBank" ADD CONSTRAINT "BloodBank_medicalEstablishmentId_fkey" FOREIGN KEY ("medicalEstablishmentId") REFERENCES "MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_locatedMedEstId_fkey" FOREIGN KEY ("locatedMedEstId") REFERENCES "MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationSchedule" ADD CONSTRAINT "CalibrationSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationLog" ADD CONSTRAINT "CalibrationLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationLog" ADD CONSTRAINT "CalibrationLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consumables" ADD CONSTRAINT "Consumables_locatedMedEstId_fkey" FOREIGN KEY ("locatedMedEstId") REFERENCES "MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumableAllocation" ADD CONSTRAINT "ConsumableAllocation_consumableId_fkey" FOREIGN KEY ("consumableId") REFERENCES "Consumables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumableAllocation" ADD CONSTRAINT "ConsumableAllocation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumableAllocation" ADD CONSTRAINT "ConsumableAllocation_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
