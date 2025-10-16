import { Request, Response } from 'express';
import { HealthVitalsService } from '../services/healthVitals.service.js';

export const HealthVitalsController = {
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, appointmentId, weight, bp, cvsPulse } = req.body;

      // Basic validation
      if (!userId || weight === undefined || bp === undefined || cvsPulse === undefined) {
        res.status(400).json({ message: "Missing required fields: userId, weight, bp, cvsPulse" });
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
      res.status(500).json({ message: "Internal server error", error: message });
    }
  },
};
