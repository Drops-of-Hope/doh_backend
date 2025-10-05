import { prisma } from "../config/db.js";
import { CreateDonationFormInput } from "../types/index.js";

export const DonationsRepository = {
  createDonationForm: async (data: CreateDonationFormInput) => {
    // Map dateTime to Date if string provided
    const dateTime = data.dateTime ? new Date(data.dateTime) : new Date();

    // Create a BloodDonationForm record (nullable userId allowed)
    // Build a plain payload and coerce to Prisma create input at the call site.
    const payload: Record<string, unknown> = {
      dateTime,
      donorId: data.donorId || undefined,
      appointmentId: data.appointmentId || undefined,
      anyDifficulty: data.anyDifficulty || "",
      anyDiseases: data.anyDiseases ? (data.anyDiseases as unknown) : undefined,
      // Ensure required boolean fields are set (default false when not provided)
      hasDonatedBefore: !!data.hasDonatedBefore,
      medicalAdvice: !!data.medicalAdvice,
      feelingWell: !!data.feelingWell,
      takingMedicines: !!data.takingMedicines,
      anySurgery: !!data.anySurgery,
      workingLater: !!data.workingLater,
      pregnant: !!data.pregnant,
      haveHepatitis: !!data.haveHepatitis,
      haveTB: !!data.haveTB,
      hadVaccination: !!data.hadVaccination,
      tattoos: !!data.tattoos,
      haveImprisonment: !!data.haveImprisonment,
      travelledAbroad: !!data.travelledAbroad,
      receivedBlood: !!data.receivedBlood,
      chemotherapy: !!data.chemotherapy,
      hadMalaria: !!data.hadMalaria,
      hasDengue: !!data.hasDengue,
      hadLongFever: !!data.hadLongFever,
      hadtoothExtraction: !!data.hadtoothExtraction,
      bookAspirin: !!data.bookAspirin,
      Acknowledgement: !!data.Acknowledgement,
      highRisk: !!data.highRisk,
      hadWeightLoss: !!data.hadWeightLoss,
    };

    // If userId provided, use nested connect to set relation
    if (data.userId) {
      // @ts--expect-error - will cast below
      payload.user = { connect: { id: data.userId } };
      // remove userId scalar if present
      delete payload.userId;
    }

    // If appointmentId provided, use nested connect to set relation
    if (data.appointmentId) {
      // @ts--expect-error - will cast below
      payload.appointment = { connect: { id: data.appointmentId } };
      // remove appointmentId scalar if present
      delete payload.appointmentId;
    }

    const created = await prisma.bloodDonationForm.create({
      // Cast to any/unchecked create to avoid strict typing churn; shape matches schema
      data: payload as unknown as Parameters<typeof prisma.bloodDonationForm.create>[0]['data'],
    });

    return created;
  },

  // Retrieve a donation form by ID
  findDonationFormById: async (id: string) => {
    return await prisma.bloodDonationForm.findUnique({
      where: { id },
      include: {
        user: true,
        appointment: true,
      },
    });
  }
};
