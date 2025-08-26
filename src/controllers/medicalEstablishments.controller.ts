import { Request, Response } from "express";
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

      if (!district || typeof district !== "string") {
        res.status(400).json({
          message: "District query parameter is required and must be a string",
        });
        return;
      }

      const establishments =
        await MedicalEstablishmentsService.getMedicalEstablishments(district);
      res.status(200).json(establishments);
    } catch (error) {
      console.error("Error fetching establishments:", error);
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
};
