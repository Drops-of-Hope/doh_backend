import { Request, Response } from "express";
import { BloodTestService } from "../services/bloodTest.service.js";

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
        res.status(400).json({
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

      res.status(200).json({
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

  // Update the Malaria test result for a blood unit
  updateMalariaTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;
      const { malaria } = req.body;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      if (typeof malaria !== "boolean") {
        res
          .status(400)
          .json({ message: "malaria (boolean) is required in body." });
        return;
      }

      const updated = await BloodTestService.updateMalariaTest(
        bloodId,
        malaria
      );

      res
        .status(200)
        .json({ message: "Malaria test updated successfully", data: updated });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating Malaria test:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to update Malaria test", error: errMsg });
    }
  },

  // Update the hemoglobin value for a blood unit and mark results as finalized
  updateHemoglobin: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;
      const { hemoglobin } = req.body;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      if (hemoglobin === undefined || hemoglobin === null) {
        res
          .status(400)
          .json({ message: "hemoglobin (number) is required in body." });
        return;
      }

      const hbValue = Number(hemoglobin);
      if (Number.isNaN(hbValue)) {
        res.status(400).json({ message: "hemoglobin must be a number." });
        return;
      }

      const updated = await BloodTestService.updateHemoglobin(bloodId, hbValue);

      res.status(200).json({
        message: "Hemoglobin updated successfully",
        data: updated,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating hemoglobin:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to update hemoglobin", error: errMsg });
    }
  },

  // Mark a blood unit as SAFE after it passes all tests
  passBloodUnit: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodId } = req.params;

      if (!bloodId) {
        res.status(400).json({ message: "Blood unit ID is required." });
        return;
      }

      const result = await BloodTestService.markAsSafe(bloodId);

      if (!result) {
        res
          .status(404)
          .json({ message: "Blood unit or test record not found." });
        return;
      }

      res
        .status(200)
        .json({ message: "Blood unit marked as SAFE", data: result });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error marking blood unit as SAFE:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to mark blood unit as SAFE", error: errMsg });
    }
  },

  // Get counts related to blood tests
  getCounts: async (_req: Request, res: Response): Promise<void> => {
    try {
      const counts = await BloodTestService.getCounts();
      res.status(200).json(counts);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching blood test counts:", errMsg);
      res
        .status(500)
        .json({ message: "Failed to fetch blood test counts", error: errMsg });
    }
  },
};
