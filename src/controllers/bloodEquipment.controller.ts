import { Request, Response } from 'express';
import { BloodEquipmentService } from '../services/bloodEquipment.service.js';
import { EquipmentType } from '@prisma/client';

export const BloodEquipmentController = {
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, serialNumber, manufacturer, model, purchaseDate, warrantyExpiry, locatedMedEstId, status } = req.body;

      // Basic validation
      if (!type || !locatedMedEstId || !status) {
        res.status(400).json({ 
          success: false,
          message: "Missing required fields: type, locatedMedEstId, status" 
        });
        return;
      }

      // Validate equipment type
      if (!Object.values(EquipmentType).includes(type as EquipmentType)) {
        res.status(400).json({ 
          success: false,
          message: "Invalid equipment type. Must be CENTRIFUGE or REFRIGERATOR" 
        });
        return;
      }

      const newEquipment = await BloodEquipmentService.create({
        type: type as EquipmentType,
        serialNumber,
        manufacturer,
        model,
        purchaseDate,
        warrantyExpiry,
        locatedMedEstId,
        status,
      });

      res.status(201).json({
        success: true,
        data: newEquipment,
        message: "Blood equipment created successfully"
      });
    } catch (error: unknown) {
      console.error("Error creating blood equipment:", error);

      // Narrow type safely
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error", 
        error: message 
      });
    }
  },

  getAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const equipment = await BloodEquipmentService.getAll();

      res.status(200).json({
        success: true,
        data: equipment,
        message: "Blood equipment retrieved successfully"
      });
    } catch (error: unknown) {
      console.error("Error retrieving blood equipment:", error);

      // Narrow type safely
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error", 
        error: message 
      });
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Basic validation
      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "Missing required parameter: id" 
        });
        return;
      }

      const equipment = await BloodEquipmentService.getById(id);

      if (!equipment) {
        res.status(404).json({ 
          success: false,
          message: "Blood equipment not found" 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: equipment,
        message: "Blood equipment retrieved successfully"
      });
    } catch (error: unknown) {
      console.error("Error retrieving blood equipment:", error);

      // Narrow type safely
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error", 
        error: message 
      });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { type, serialNumber, manufacturer, model, purchaseDate, warrantyExpiry, locatedMedEstId, status } = req.body;

      // Basic validation
      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "Missing required parameter: id" 
        });
        return;
      }

      // Validate equipment type if provided
      if (type && !Object.values(EquipmentType).includes(type as EquipmentType)) {
        res.status(400).json({ 
          success: false,
          message: "Invalid equipment type. Must be CENTRIFUGE or REFRIGERATOR" 
        });
        return;
      }

      // Check if equipment exists
      const existingEquipment = await BloodEquipmentService.getById(id);
      if (!existingEquipment) {
        res.status(404).json({ 
          success: false,
          message: "Blood equipment not found" 
        });
        return;
      }

      const updatedEquipment = await BloodEquipmentService.update(id, {
        type: type as EquipmentType,
        serialNumber,
        manufacturer,
        model,
        purchaseDate,
        warrantyExpiry,
        locatedMedEstId,
        status,
      });

      res.status(200).json({
        success: true,
        data: updatedEquipment,
        message: "Blood equipment updated successfully"
      });
    } catch (error: unknown) {
      console.error("Error updating blood equipment:", error);

      // Narrow type safely
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error", 
        error: message 
      });
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Basic validation
      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "Missing required parameter: id" 
        });
        return;
      }

      // Check if equipment exists
      const existingEquipment = await BloodEquipmentService.getById(id);
      if (!existingEquipment) {
        res.status(404).json({ 
          success: false,
          message: "Blood equipment not found" 
        });
        return;
      }

      await BloodEquipmentService.delete(id);

      res.status(200).json({ 
        success: true,
        message: "Blood equipment deleted successfully" 
      });
    } catch (error: unknown) {
      console.error("Error deleting blood equipment:", error);

      // Narrow type safely
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error", 
        error: message 
      });
    }
  },
};
