import { Request, Response } from "express";
import { AppointmentsService } from "../services/appointments.service.js";

export const AppointmentsController = {
  createAppointment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { donorId, slotId, appointmentDate } = req.body;

      // Validate required fields
      if (!donorId || !slotId || !appointmentDate) {
        res.status(400).json({
          message: "Missing required fields: donorId, appointmentSlotId, and appointmentDate are required",
        });
        return;
      }

      // Validate appointmentDate format
      const parsedDate = new Date(appointmentDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({
          message: "Invalid appointment date format",
        });
        return;
      }

      // Check if appointment date is in the future
      if (parsedDate <= new Date()) {
        res.status(400).json({
          message: "Appointment date must be in the future",
        });
        return;
      }

      const appointment = await AppointmentsService.createAppointment({
        donorId,
        slotId,
        appointmentDate: parsedDate,
      });

      res.status(201).json({
        message: "Appointment created successfully",
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

  getAppointment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId } = req.params;

      if (!appointmentId) {
        res.status(400).json({
          message: "Appointment ID is required",
        });
        return;
      }

      const appointment = await AppointmentsService.getAppointmentById(appointmentId);

      if (!appointment) {
        res.status(404).json({
          message: "Appointment not found",
        });
        return;
      }

      res.status(200).json(appointment);
    } catch (error) {
      console.error("Error getting appointment:", error);
      res.status(500).json({
        message: "Failed to get appointment",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
