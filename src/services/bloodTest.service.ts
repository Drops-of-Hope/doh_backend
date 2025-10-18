// Clean implementation with HIV-positive side effects
import { BloodTestRepository } from "../repositories/bloodTest.repository.js";
import { EligibilityService } from "./eligibility.service.js";
import { NotificationService } from "./notification.service.js";
import { NotificationType } from "@prisma/client";

export const BloodTestService = {
  // Get all blood units awaiting testing for a specific medical establishment inventory
  async findAll(inventoryId: string) {
    try {
      const bloodUnits = await BloodTestRepository.findAll(inventoryId);
      return bloodUnits;
    } catch (error) {
      console.error("Error in BloodTestService.findAll:", error);
      throw new Error("Failed to fetch blood units awaiting testing");
    }
  },

  async findById(bloodId: string) {
    try {
      const bloodUnit = await BloodTestRepository.findById(bloodId);

      if (!bloodUnit) {
        return null; // Return null if not found
      }

      return bloodUnit;
    } catch (error) {
      console.error("Error in BloodTestService.findById:", error);
      throw new Error("Failed to fetch blood unit");
    }
  },

  // Update the ABOTest (blood type) for a blood unit. Creates a BloodTest record if needed.
  async updateBloodType(bloodId: string, aboTest: string) {
    try {
      if (!bloodId || !aboTest) {
        throw new Error("Missing bloodId or aboTest");
      }

      const updated = await BloodTestRepository.upsertABOTest(bloodId, aboTest);
      return updated;
    } catch (error) {
      console.error("Error in BloodTestService.updateBloodType:", error);
      throw new Error("Failed to update blood type");
    }
  },

  // Retrieve the BloodTest record by bloodId
  async findTestByBloodId(bloodId: string) {
    try {
      const test = await BloodTestRepository.findTestByBloodId(bloodId);
      return test;
    } catch (error) {
      console.error("Error in BloodTestService.findTestByBloodId:", error);
      throw new Error("Failed to fetch blood test");
    }
  },

  // Update the HIV test result for a blood unit. Creates a BloodTest record if needed.
  async updateHivTest(bloodId: string, hivTest: boolean) {
    try {
      if (!bloodId || typeof hivTest !== "boolean") {
        throw new Error("Missing bloodId or invalid hivTest");
      }

      const updated = await BloodTestRepository.upsertHivTest(bloodId, hivTest);

      // If HIV is positive (true), mark donor ineligible for 60 years and notify them
      if (hivTest === true) {
        try {
          // Try to resolve the userId via blood -> bloodDonation -> user
          const userId =
            (updated as any)?.blood?.bloodDonation?.user?.id ?? null;

          if (userId) {
            // Calculate +60 years from today
            const nextEligibleDate = new Date();
            nextEligibleDate.setFullYear(nextEligibleDate.getFullYear() + 60);

            // Update eligibility via EligibilityService
            await EligibilityService.updateNextEligible({
              userId,
              nextEligible: nextEligibleDate.toISOString(),
            });

            // Create a notification for the donor
            await NotificationService.createNotification({
              userId,
              type: NotificationType.GENERAL,
              title: "Blood Rejected",
              message:
                "Your donated blood unit was rejected. Please contact the blood bank for confidential information.",
              metadata: {
                reason: "HIV_POSITIVE",
                bloodId,
              },
            });
          } else {
            console.warn(
              "Could not determine userId from bloodId when HIV test was true",
              { bloodId }
            );
          }
        } catch (sideEffectErr) {
          console.error(
            "Failed to apply HIV-positive side effects (eligibility/notification):",
            sideEffectErr
          );
          // Do not block main update on side-effect failures
        }
      }

      return updated;
    } catch (error) {
      console.error("Error in BloodTestService.updateHivTest:", error);
      throw new Error("Failed to update HIV test");
    }
  },

  // Update the Syphilis test result for a blood unit. Creates a BloodTest record if needed.
  async updateSyphilisTest(bloodId: string, syphilis: boolean) {
    try {
      if (!bloodId || typeof syphilis !== "boolean") {
        throw new Error("Missing bloodId or invalid syphilis");
      }

      const updated = await BloodTestRepository.upsertSyphilisTest(
        bloodId,
        syphilis
      );
      return updated;
    } catch (error) {
      console.error("Error in BloodTestService.updateSyphilisTest:", error);
      throw new Error("Failed to update Syphilis test");
    }
  },

  // Update Hepatitis B and/or Hepatitis C test results for a blood unit
  async updateHepatitisTest(
    bloodId: string,
    data: { hepatitisB?: boolean; hepatitisC?: boolean }
  ) {
    try {
      if (!bloodId) {
        throw new Error("Missing bloodId");
      }

      const { hepatitisB, hepatitisC } = data;

      if (hepatitisB === undefined && hepatitisC === undefined) {
        throw new Error("At least one of hepatitisB or hepatitisC is required");
      }

      const updated = await BloodTestRepository.upsertHepatitisTest(
        bloodId,
        hepatitisB,
        hepatitisC
      );

      return updated;
    } catch (error) {
      console.error("Error in BloodTestService.updateHepatitisTest:", error);
      throw new Error("Failed to update Hepatitis tests");
    }
  },

  // Update the Malaria test result for a blood unit. Creates a BloodTest record if needed.
  async updateMalariaTest(bloodId: string, malaria: boolean) {
    try {
      if (!bloodId || typeof malaria !== "boolean") {
        throw new Error("Missing bloodId or invalid malaria");
      }

      const updated = await BloodTestRepository.upsertMalariaTest(
        bloodId,
        malaria
      );
      return updated;
    } catch (error) {
      console.error("Error in BloodTestService.updateMalariaTest:", error);
      throw new Error("Failed to update Malaria test");
    }
  },

  // Update hemoglobin value and mark resultPending as false (finalize results)
  async updateHemoglobin(bloodId: string, hemoglobin: number) {
    try {
      if (!bloodId || hemoglobin === undefined || hemoglobin === null) {
        throw new Error("Missing bloodId or hemoglobin");
      }

      const updated = await BloodTestRepository.upsertHemoglobin(
        bloodId,
        hemoglobin
      );

      return updated;
    } catch (error) {
      console.error("Error in BloodTestService.updateHemoglobin:", error);
      throw new Error("Failed to update hemoglobin");
    }
  },

  // Mark both the bloodTest record and the blood record as SAFE
  async markAsSafe(bloodId: string) {
    try {
      if (!bloodId) throw new Error("Missing bloodId");

      const result = await BloodTestRepository.markAsSafe(bloodId);
      return result;
    } catch (error) {
      console.error("Error in BloodTestService.markAsSafe:", error);
      throw new Error("Failed to mark blood unit as SAFE");
    }
  },

  // Get summary counts related to blood tests for current month
  async getCounts() {
    try {
      const counts = await BloodTestRepository.getCountsThisMonth();
      return counts;
    } catch (error) {
      console.error("Error in BloodTestService.getCounts:", error);
      throw new Error("Failed to fetch blood test counts");
    }
  },
};
