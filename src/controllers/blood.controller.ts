import { Request, Response } from "express";
import BloodService from "../services/blood.service.js";

export const BloodController = {
  checkAvailability: async (req: Request, res: Response): Promise<void> => {
    try {
      const { inventory_id, blood_group, number_of_units_requested } = req.body ?? {};

      // Manual validation
      if (!inventory_id || typeof inventory_id !== "string") {
        res.status(400).json({ message: "inventory_id is required and must be a string" });
        return;
      }
      if (!blood_group || typeof blood_group !== "string") {
        res.status(400).json({ message: "blood_group is required and must be a string" });
        return;
      }
      const num = Number(number_of_units_requested);
      if (!Number.isFinite(num) || num <= 0) {
        res.status(400).json({ message: "number_of_units_requested must be a number greater than 0" });
        return;
      }

      const { totalAvailableUnits, matchingCount } = await BloodService.checkAvailability(
        inventory_id,
        blood_group,
        num
      );

      if (matchingCount === 0) {
        res.status(200).json({
          message: "No safe and available blood units found for this inventory and blood group.",
          available_units: 0,
        });
        return;
      }

      if (totalAvailableUnits >= num) {
        res.status(200).json({
          message: `Success. Requested ${num} units are available.`,
          available_units: totalAvailableUnits,
        });
        return;
      }

      res.status(200).json({
        message: `Only ${totalAvailableUnits} units available.`,
        available_units: totalAvailableUnits,
      });
    } catch (error) {
      console.error("Error checking blood availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  listAvailableUnits: async (req: Request, res: Response): Promise<void> => {
    try {
      const { inventory_id, blood_group } = req.body ?? {};

      if (!inventory_id || typeof inventory_id !== "string") {
        res.status(400).json({ message: "inventory_id is required and must be a string" });
        return;
      }
      if (!blood_group || typeof blood_group !== "string") {
        res.status(400).json({ message: "blood_group is required and must be a string" });
        return;
      }

      const { items, totalAvailableUnits, count } = await BloodService.listAvailableUnits(
        inventory_id,
        blood_group
      );

      if (count === 0) {
        res.status(200).json({
          message: "No safe and available blood units found for this inventory and blood group.",
          available_units: 0,
          count: 0,
          data: [],
        });
        return;
      }

      res.status(200).json({
        message: "Success.",
        available_units: totalAvailableUnits,
        count,
        data: items,
      });
    } catch (error) {
      console.error("Error listing blood units:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

export default BloodController;
