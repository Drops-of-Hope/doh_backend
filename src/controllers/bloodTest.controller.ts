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
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching blood units for testing:", errMsg);
      res.status(500).json({
        message: "Failed to fetch blood units awaiting testing.",
        error: errMsg,
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
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching blood unit:", errMsg);
      res.status(500).json({
        message: "Failed to fetch blood unit.",
        error: errMsg,
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
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating blood type:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to update blood type", error: errMsg });
    }
  },

  // Get the BloodTest record for a specific blood unit
  getTestByBloodId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      const test = await BloodTestService.findTestByBloodId(bloodId);

      if (!test) {
        res.status(404).json({ message: "Blood test not found." });
        return;
      }

      res.status(200).json(test);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching blood test:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to fetch blood test", error: errMsg });
    }
  },

  // Update the HIV test result for a blood unit
  updateHivTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;
      const { hivTest } = req.body;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      if (typeof hivTest !== "boolean") {
        res
          .status(400)
          .json({ message: "hivTest (boolean) is required in body." });
        return;
      }

      const updated = await BloodTestService.updateHivTest(bloodId, hivTest);

      res
        .status(200)
        .json({ message: "HIV test updated successfully", data: updated });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating HIV test:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to update HIV test", error: errMsg });
    }
  },

  // Update the Syphilis test result for a blood unit
  updateSyphilisTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;
      const { syphilis } = req.body;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      if (typeof syphilis !== "boolean") {
        res
          .status(400)
          .json({ message: "syphilis (boolean) is required in body." });
        return;
      }

      const updated = await BloodTestService.updateSyphilisTest(
        bloodId,
        syphilis
      );

      res
        .status(200)
        .json({ message: "Syphilis test updated successfully", data: updated });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating Syphilis test:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to update Syphilis test", error: errMsg });
    }
  },

  // Update Hepatitis B and/or Hepatitis C test results for a blood unit
  updateHepatitisTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;
      const { hepatitisB, hepatitisC } = req.body;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      if (hepatitisB === undefined && hepatitisC === undefined) {
        res
          .status(400)
          .json({
            message:
              "At least one of hepatitisB or hepatitisC (boolean) is required in body.",
          });
        return;
      }

      if (hepatitisB !== undefined && typeof hepatitisB !== "boolean") {
        res
          .status(400)
          .json({ message: "hepatitisB must be a boolean if provided." });
        return;
      }

      if (hepatitisC !== undefined && typeof hepatitisC !== "boolean") {
        res
          .status(400)
          .json({ message: "hepatitisC must be a boolean if provided." });
        return;
      }

      const updated = await BloodTestService.updateHepatitisTest(bloodId, {
        hepatitisB,
        hepatitisC,
      });

      res
        .status(200)
        .json({
          message: "Hepatitis tests updated successfully",
          data: updated,
        });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating Hepatitis tests:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to update Hepatitis tests", error: errMsg });
    }
  },
};
