import { Request, Response } from "express";
import { AppointmentSlotsService } from "../services/appointmentSlots.service";

export const AppointmentSlotsController = {
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        startTime,
        endTime,
        appointmentDuration,
        restTime,
        medicalEstablishmentId,
      } = req.body;

      //to validate time format
      const isValidTimeFormat = (time: string): boolean => {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
      };

      //to convert time string to minutes
      const timeToMinutes = (timeString: string): number => {
        const [hours, minutes] = timeString.split(":").map(Number);
        return hours * 60 + minutes;
      };

      if (
        !startTime ||
        !endTime ||
        typeof startTime !== "string" ||
        typeof endTime !== "string"
      ) {
        res.status(400).json({
          message:
            "Start time and end time are required and must be strings in HH:MM format",
        });
        return;
      }

      if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
        res.status(400).json({
          message:
            'Invalid time format. Please use HH:MM format (e.g., "09:00", "14:30")',
        });
        return;
      }

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      if (startMinutes >= endMinutes) {
        res.status(400).json({
          message: "Start time must be before end time",
        });
        return;
      }

      if (!appointmentDuration || appointmentDuration <= 0) {
        res.status(400).json({
          message: "Appointment duration must be greater than 0",
        });
        return;
      }

      if (!medicalEstablishmentId) {
        res.status(400).json({
          message: "Medical establishment ID is required",
        });
        return;
      }

      const createdSlots = await AppointmentSlotsService.createAppointmentSlots(
        {
          startTime,
          endTime,
          appointmentDuration,
          restTime,
          medicalEstablishmentId,
        }
      );

      res.status(201).json({
        message: `Successfully created ${createdSlots.length} appointment slots`,
        slots: createdSlots,
      });
    } catch (error) {
      console.error("Error creating appointment slots:", error);
      res.status(500).json({
        message: "Failed to create appointment slots",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  getAvailableSlots: async (req: Request, res: Response): Promise<void> => {
    try {
      const { establishmentId } = req.query;
      if (!establishmentId || typeof establishmentId !== "string") {
        res.status(400).json({
          message: "Establishment ID is required and must be a string",
        });
        return;
      }
      const slots = await AppointmentSlotsService.getAvailableSlots(
        establishmentId
      );
      res.status(200).json(slots);
    } catch (error) {
      console.error("Error retrieving available slots:", error);
      res.status(500).json({
        message: "Failed to retrieve available slots",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  createAppointment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { donorId, bdfId, appointmentDateTime } = req.body;

      if (!donorId || !bdfId || !appointmentDateTime) {
        res.status(400).json({
          message: "Donor ID, BDF ID, and appointment date/time are required",
        });
        return;
      }

      const appointment = await AppointmentSlotsService.createAppointment({
        donorId,
        bdfId,
        appointmentDateTime,
      });

      res.status(201).json({
        message: "Successfully created appointment",
        appointment,
      });
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({
        message: "Failed to create appointment",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
