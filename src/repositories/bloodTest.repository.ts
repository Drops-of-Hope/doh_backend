import { prisma } from "../config/db.js";

export const BloodTestRepository = {
  // Get all blood tests pending for a specific inventory
  async findAll(inventoryId: string) {
    return prisma.blood.findMany({
      where: {
        inventoryId,
        status: "PENDING",
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

  // Update or create a BloodTest record's ABOTest (blood group) for a given blood unit
  async upsertABOTest(bloodId: string, aboTest: string) {
    // If a BloodTest already exists for this blood unit, update the ABOTest
    const existing = await prisma.bloodTest.findFirst({ where: { bloodId } });

    let result;

    if (existing) {
      // Update only ABOTest and timestamp. Keep the overall status as-is
      // because other tests may still be pending. Mark resultPending true
      // to indicate there are still remaining test results expected.
      result = await prisma.bloodTest.update({
        where: { id: existing.id },
        data: {
          ABOTest: aboTest as any,
          testDateTime: new Date(),
          resultPending: true,
        },
        include: {
          blood: true,
        },
      });
    } else {
      // Otherwise create a new BloodTest record with PENDING status and resultPending true
      result = await prisma.bloodTest.create({
        data: {
          bloodId,
          testDateTime: new Date(),
          status: "PENDING",
          ABOTest: aboTest as any,
          hivTest: false,
          hemoglobin: 0,
          syphilis: false,
          hepatitisB: false,
          hepatitisC: false,
          malaria: false,
          resultPending: true,
        },
        include: {
          blood: true,
        },
      });
    }

    // After updating/creating, check if all test fields have values. If so,
    // finalize the record by marking status TESTED and clearing resultPending.
    // const allDone = await BloodTestRepository.checkIfAllTestsDone(bloodId);
    // if (allDone) {
    //   const finalized = await prisma.bloodTest.update({
    //     where: { id: result.id },
    //     data: {
    //       status: "TESTED",
    //       resultPending: false,
    //     },
    //     include: { blood: true },
    //   });
    //   return finalized;
    // }

    return result;
  },

  // Check whether all required test fields for a blood unit have values
  async checkIfAllTestsDone(bloodId: string) {
    const test = await prisma.bloodTest.findFirst({ where: { bloodId } });
    if (!test) return false;

    const allFieldsFilled =
      test.ABOTest !== undefined &&
      test.ABOTest !== null &&
      test.hivTest !== undefined &&
      test.hivTest !== null &&
      test.syphilis !== undefined &&
      test.syphilis !== null &&
      test.hepatitisB !== undefined &&
      test.hepatitisB !== null &&
      test.hepatitisC !== undefined &&
      test.hepatitisC !== null &&
      test.malaria !== undefined &&
      test.malaria !== null &&
      test.hemoglobin !== undefined &&
      test.hemoglobin !== null;

    return allFieldsFilled;
  },
};
