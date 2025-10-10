// src/services/bloodTest.service.ts
import { BloodTestRepository } from "../repositories/bloodTest.repository";

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
      return updated;
    } catch (error) {
      console.error("Error in BloodTestService.updateHivTest:", error);
      throw new Error("Failed to update HIV test");
    }
  },
};
