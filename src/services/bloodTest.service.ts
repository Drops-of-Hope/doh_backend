// src/services/bloodTest.service.ts
import { BloodTestRepository } from '../repositories/bloodTest.repository';

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
  
};
