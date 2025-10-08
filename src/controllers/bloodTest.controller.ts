import { Request, Response } from "express";
import { BloodTestService } from "../services/bloodTest.service";

export const BloodTestController = {
  // Get all blood units waiting to be tested for a specific medical establishment inventory
  findAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const { inventoryId } = req.params;

      if (!inventoryId) {
        res.status(400).json({ message: "Inventory ID is required." });
        return;
      }

      const bloodUnits = await BloodTestService.findAll(inventoryId);

      res.status(200).json(bloodUnits);
    } catch (error: any) {
      console.error("Error fetching blood units for testing:", error);
      res.status(500).json({
        message: "Failed to fetch blood units awaiting testing.",
        error: error.message,
      });
    }
  },

  findBloodUnit: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      const bloodUnit = await BloodTestService.findById(bloodId);

      if (!bloodUnit) {
        res.status(404).json({ message: "Blood unit not found." });
        return;
      }

      res.status(200).json(bloodUnit);
    } catch (error: any) {
      console.error("Error fetching blood unit:", error);
      res.status(500).json({
        message: "Failed to fetch blood unit.",
        error: error.message,
      });
    }
  },

  // Update the ABOTest (blood type) for a blood unit
  updateBloodType: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;
      const { aboTest } = req.body;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      if (!aboTest || typeof aboTest !== "string") {
        res
          .status(400)
          .json({ message: "aboTest (blood group) is required in body." });
        return;
      }

      const updated = await BloodTestService.updateBloodType(bloodId, aboTest);

      res.status(200).json({
        message: "Blood test updated successfully",
        data: updated,
      });
    } catch (error: any) {
      console.error("Error updating blood type:", error);
      res
        .status(500)
        .json({ message: "Failed to update blood type", error: error.message });
    }
  },
};
