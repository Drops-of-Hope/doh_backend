-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'STAFF');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('FIXED', 'MOBILE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CANCELLED', 'COMPLETED', 'PENDING');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('TESTED', 'SAFE', 'DISCARDED', 'PENDING');

-- CreateEnum
CREATE TYPE "BagType" AS ENUM ('Q', 'T', 'D', 'S');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransitStatus" AS ENUM ('IN_TRANSIT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "District" AS ENUM ('COLOMBO', 'KALUTARA', 'GAMPAHA', 'GALLE', 'MATARA', 'HAMBANTOTA', 'ANURADHAPURA', 'POLONNARUWA', 'JAFFNA', 'MANNAR', 'KILINOCHCHI', 'KURUNEGALA', 'PUTTALAM', 'TRINCOMALEE', 'BATTICALOA', 'AMPARA', 'BADULLA', 'KANDY', 'KEGALLE', 'MATALE', 'NUWARA_ELIYA', 'MONARAGALA', 'MULLAITIVU', 'VAVUNIYA', 'RATNAPURA');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('CENTRIFUGE', 'REFRIGERATOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nic" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDetail" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodDonationForm" (
    "id" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "donorId" TEXT,
    "hasDonatedBefore" BOOLEAN,
    "anyDifficulty" TEXT NOT NULL,
    "medicalAdvice" BOOLEAN NOT NULL,
    "feelingWell" BOOLEAN NOT NULL,
    "anyDiseases" JSONB NOT NULL,
    "takingMedicines" BOOLEAN NOT NULL,
    "anySurgery" BOOLEAN NOT NULL,
    "workingLater" BOOLEAN NOT NULL,
    "pregnant" BOOLEAN NOT NULL,
    "haveHepatitis" BOOLEAN NOT NULL,
    "haveTB" BOOLEAN NOT NULL,
    "hadVaccination" BOOLEAN NOT NULL,
    "tattoos" BOOLEAN NOT NULL,
    "haveImprisonment" BOOLEAN NOT NULL,
    "travelledAbroad" BOOLEAN NOT NULL,
    "receivedBlood" BOOLEAN NOT NULL,
    "chemotherapy" BOOLEAN NOT NULL,
    "hadMalaria" BOOLEAN NOT NULL,
    "hasDengue" BOOLEAN NOT NULL,
    "hadLongFever" BOOLEAN NOT NULL,
    "hadtoothExtraction" BOOLEAN NOT NULL,
    "bookAspirin" BOOLEAN NOT NULL,
    "Acknowledgement" BOOLEAN NOT NULL,
    "highRisk" BOOLEAN NOT NULL,
    "hadWeightLoss" BOOLEAN NOT NULL,
    "userId" TEXT,

    CONSTRAINT "BloodDonationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodDonation" (
    "id" TEXT NOT NULL,
    "bdfId" TEXT NOT NULL,
    "userId" TEXT,
    "numberOfDonations" INTEGER,
    "pointsEarned" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodDonation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "bloodDonationId" TEXT NOT NULL,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "location" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "expectedDonors" INTEGER NOT NULL,
    "contactPersonName" TEXT NOT NULL,
    "contactPersonPhone" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL,
    "medicalEstablishmentId" TEXT NOT NULL,
    "bloodbankId" TEXT,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "bdfId" TEXT NOT NULL,
    "scheduled" "AppointmentStatus" NOT NULL,
    "appointmentDateTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "EstablishmentId" TEXT NOT NULL,
    "lastChecked" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodTest" (
    "id" TEXT NOT NULL,
    "bloodId" TEXT NOT NULL,
    "testDateTime" TIMESTAMP(3) NOT NULL,
    "status" "TestStatus" NOT NULL,
    "ABOTest" "BloodGroup" NOT NULL,
    "hivTest" BOOLEAN NOT NULL,
    "hemoglobin" DOUBLE PRECISION NOT NULL,
    "syphilis" BOOLEAN NOT NULL,
    "hepatitisB" BOOLEAN NOT NULL,
    "hepatitisC" BOOLEAN NOT NULL,
    "malaria" BOOLEAN NOT NULL,
    "resultPending" BOOLEAN NOT NULL,
    "appointmentId" TEXT,
    "inventoryId" TEXT,

    CONSTRAINT "BloodTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blood" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "status" "TestStatus" NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "bagType" "BagType" NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "disposed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Blood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodRequest" (
    "id" TEXT NOT NULL,
    "requestedDateTime" TIMESTAMP(3) NOT NULL,
    "bloodTypeAndAmount" JSONB NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "bloodId" TEXT NOT NULL,
    "bloodBankId" TEXT,

    CONSTRAINT "BloodRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodTransit" (
    "id" TEXT NOT NULL,
    "transitStatus" "TransitStatus" NOT NULL,
    "receiverHospitalId" TEXT NOT NULL,
    "dispatchDateTime" TIMESTAMP(3) NOT NULL,
    "deliveryDateTime" TIMESTAMP(3) NOT NULL,
    "deliveryVehicle" TEXT NOT NULL,
    "bloodRequestId" TEXT,
    "bloodId" TEXT NOT NULL,
    "bloodBankId" TEXT,

    CONSTRAINT "BloodTransit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" "District" NOT NULL,
    "email" TEXT NOT NULL,
    "bloodCapacity" INTEGER NOT NULL,
    "medicalEstablishmentId" TEXT NOT NULL,
    "inventoryId" TEXT,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodBank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" "District" NOT NULL,
    "email" TEXT NOT NULL,
    "bloodCapacity" INTEGER NOT NULL,
    "isBloodBank" BOOLEAN NOT NULL,
    "medicalEstablishmentId" TEXT NOT NULL,
    "inventoryId" TEXT,

    CONSTRAINT "BloodBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEstablishment" (
    "id" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "serialNumber" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "locatedMedEstId" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAssignment" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "assignmentStartDate" TIMESTAMP(3) NOT NULL,
    "assignmentEndDate" TIMESTAMP(3),
    "assignedById" TEXT NOT NULL,

    CONSTRAINT "EquipmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationSchedule" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "calibrationFrequency" TEXT NOT NULL,
    "nextCalibrationDate" TIMESTAMP(3) NOT NULL,
    "alertBeforeDays" INTEGER,

    CONSTRAINT "CalibrationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationLog" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "calibrationDate" TIMESTAMP(3) NOT NULL,
    "performedById" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CalibrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "maintenanceDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "performedById" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "roleInCampaign" TEXT NOT NULL,
    "assignmentStartDate" TIMESTAMP(3) NOT NULL,
    "assignmentEndDate" TIMESTAMP(3),

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dummy" (
    "id" SERIAL NOT NULL,
    "dummyName" TEXT NOT NULL,

    CONSTRAINT "Dummy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nic_key" ON "User"("nic");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserDetail_userId_key" ON "UserDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BloodDonation_bdfId_key" ON "BloodDonation"("bdfId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_bdfId_key" ON "Appointment"("bdfId");

-- AddForeignKey
ALTER TABLE "UserDetail" ADD CONSTRAINT "UserDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodDonationForm" ADD CONSTRAINT "BloodDonationForm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodDonation" ADD CONSTRAINT "BloodDonation_bdfId_fkey" FOREIGN KEY ("bdfId") REFERENCES "BloodDonationForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodDonation" ADD CONSTRAINT "BloodDonation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_bloodDonationId_fkey" FOREIGN KEY ("bloodDonationId") REFERENCES "BloodDonation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_medicalEstablishmentId_fkey" FOREIGN KEY ("medicalEstablishmentId") REFERENCES "MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_bloodbankId_fkey" FOREIGN KEY ("bloodbankId") REFERENCES "BloodBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_bdfId_fkey" FOREIGN KEY ("bdfId") REFERENCES "BloodDonationForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_EstablishmentId_fkey" FOREIGN KEY ("EstablishmentId") REFERENCES "MedicalEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTest" ADD CONSTRAINT "BloodTest_bloodId_fkey" FOREIGN KEY ("bloodId") REFERENCES "Blood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTest" ADD CONSTRAINT "BloodTest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTest" ADD CONSTRAINT "BloodTest_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blood" ADD CONSTRAINT "Blood_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "BloodDonation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blood" ADD CONSTRAINT "Blood_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_bloodId_fkey" FOREIGN KEY ("bloodId") REFERENCES "Blood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_bloodBankId_fkey" FOREIGN KEY ("bloodBankId") REFERENCES "BloodBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransit" ADD CONSTRAINT "BloodTransit_receiverHospitalId_fkey" FOREIGN KEY ("receiverHospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransit" ADD CONSTRAINT "BloodTransit_bloodRequestId_fkey" FOREIGN KEY ("bloodRequestId") REFERENCES "BloodRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransit" ADD CONSTRAINT "BloodTransit_bloodId_fkey" FOREIGN KEY ("bloodId") REFERENCES "Blood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodTransit" ADD CONSTRAINT "BloodTransit_bloodBankId_fkey" FOREIGN KEY ("bloodBankId") REFERENCES "BloodBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationSchedule" ADD CONSTRAINT "CalibrationSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationLog" ADD CONSTRAINT "CalibrationLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationLog" ADD CONSTRAINT "CalibrationLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
