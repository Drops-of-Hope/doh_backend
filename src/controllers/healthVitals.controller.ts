import { Request, Response } from "express";
import { HealthVitalsService } from "../services/healthVitals.service.js";

export const HealthVitalsController = {
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, appointmentId, weight, bp, cvsPulse } = req.body;

      // Basic validation
      if (
        !userId ||
        weight === undefined ||
        bp === undefined ||
        cvsPulse === undefined
      ) {
        res
          .status(400)
          .json({
            message: "Missing required fields: userId, weight, bp, cvsPulse",
          });
        return;
      }

      const newHealthVital = await HealthVitalsService.create({
        userId,
        appointmentId,
        weight: parseFloat(weight),
        bp: parseFloat(bp),
        cvsPulse: parseFloat(cvsPulse),
      });

      res.status(201).json(newHealthVital);
    } catch (error: unknown) {
      console.error("Error creating health vital:", error);

      // Narrow type safely
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ message: "Internal server error", error: message });
    }
  },

  getByAppointmentId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId } = req.params;

      // Basic validation
      if (!appointmentId) {
        res
          .status(400)
          .json({ message: "Missing required parameter: appointmentId" });
        return;
      }

      const healthVitals = await HealthVitalsService.getByAppointmentId(
        appointmentId
      );

      if (!healthVitals || healthVitals.length === 0) {
        res
          .status(404)
          .json({
            message: "No health vitals found for the given appointment ID",
          });
        return;
      }

      res.status(200).json(healthVitals);
    } catch (error: unknown) {
      console.error("Error retrieving health vitals:", error);

      // Narrow type safely
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ message: "Internal server error", error: message });
    }
  },

  getByUserId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Basic validation
      if (!userId) {
        res.status(400).json({ message: "Missing required parameter: userId" });
        return;
      }

      const healthVitals = await HealthVitalsService.getByUserId(userId);

      if (!healthVitals || healthVitals.length === 0) {
        res
          .status(404)
          .json({ message: "No health vitals found for the given user ID" });
        return;
      }

      res.status(200).json(healthVitals);
    } catch (error: unknown) {
      console.error("Error retrieving health vitals by user ID:", error);

      // Narrow type safely
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ message: "Internal server error", error: message });
    }
  },
};
