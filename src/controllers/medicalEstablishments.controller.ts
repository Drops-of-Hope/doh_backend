import { Request, Response } from "express";
import { MedicalEstablishment } from "@prisma/client";
import { MedicalEstablishmentsService } from "../services/medicalEstablishments.service.js";

export const MedicalEstablishmentsController = {
  getMedicalEstablishments: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    console.log("Request received:", req.method, req.originalUrl);
    console.log("Query parameters:", req.query);
    try {
      const { district } = req.query;

      let establishments;
      if (district && typeof district === "string") {
        establishments =
          await MedicalEstablishmentsService.getMedicalEstablishments(district);
      } else {
        establishments =
          await MedicalEstablishmentsService.getAllMedicalEstablishments();
      }

      // Ensure response format matches frontend requirements
      const formattedEstablishments = establishments.map(
        (est: MedicalEstablishment) => ({
          id: est.id,
          name: est.name,
          address: est.address,
          region: est.region,
          email: est.email,
          bloodCapacity: est.bloodCapacity,
          isBloodBank: est.isBloodBank,
        })
      );

      res.status(200).json({
        data: formattedEstablishments,
      });
    } catch (error) {
      console.error("Error fetching establishments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Explicit endpoint to fetch all establishments (no filtering)
  getAllMedicalEstablishments: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const establishments =
        await MedicalEstablishmentsService.getAllMedicalEstablishments();

      const formattedEstablishments = establishments.map(
        (est: MedicalEstablishment) => ({
          id: est.id,
          name: est.name,
          address: est.address,
          region: est.region,
          email: est.email,
          bloodCapacity: est.bloodCapacity,
          isBloodBank: est.isBloodBank,
        })
      );

      res.status(200).json({
        data: formattedEstablishments,
      });
    } catch (error) {
      console.error("Error fetching all establishments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getSlots: async (req: Request, res: Response): Promise<void> => {
    try {
      const { establishmentId } = req.params;
      const { date } = req.query;

      if (!establishmentId) {
        res.status(400).json({
          message: "Establishment ID is required",
        });
        return;
      }

      if (!date || typeof date !== "string") {
        res.status(400).json({
          message: "Date query parameter is required and must be a string",
        });
        return;
      }

      const slots = await MedicalEstablishmentsService.getSlots(
        establishmentId,
        date
      );
      res.status(200).json(slots);
    } catch (error) {
      console.error("Error retrieving appointment slots:", error);
      res.status(500).json({
        message: "Failed to retrieve appointment slots",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  getInventory: async (req: Request, res: Response): Promise<void> => {
    try {
      const { establishmentId } = req.params;

      if (!establishmentId) {
        res.status(400).json({
          message: "Medical establishment ID is required",
        });
        return;
      }

      const inventory = await MedicalEstablishmentsService.getInventory(
        establishmentId
      );

      if (!inventory) {
        res.status(404).json({
          message: "No inventory found for the specified establishment",
        });
        return;
      }

      res.status(200).json(inventory);
    } catch (error) {
      console.error("Error fetching inventory details:", error);
      res.status(500).json({
        message: "Failed to retrieve inventory details",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
