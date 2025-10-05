import { Request, Response } from "express";
import { AppointmentsService } from "../services/appointments.service.js";

export const AppointmentsController = {
  createAppointment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { donorId, slotId, appointmentDate, medicalEstablishmentId } = req.body;

      if (!donorId || !slotId || !appointmentDate || !medicalEstablishmentId) {
        res.status(400).json({ message: "Missing required fields: donorId, slotId, appointmentDate, and medicalEstablishmentId are required" });
        return;
      }

      const parsedDate = new Date(appointmentDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ message: "Invalid appointment date format" });
        return;
      }

      if (parsedDate <= new Date()) {
        res.status(400).json({ message: "Appointment date must be in the future" });
        return;
      }

      const appointment = await AppointmentsService.createAppointment({ donorId, slotId, appointmentDate: parsedDate, medicalEstablishmentId });

      res.status(201).json({ message: "Appointment created successfully", appointment });
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  getAppointment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId } = req.params;
      if (!appointmentId) {
        res.status(400).json({ message: "Appointment ID is required" });
        return;
      }
      const appointment = await AppointmentsService.getAppointmentById(appointmentId);
      if (!appointment) {
        res.status(404).json({ message: "Appointment not found" });
        return;
      }
      res.status(200).json(appointment);
    } catch (error) {
      console.error("Error getting appointment:", error);
      res.status(500).json({ message: "Failed to get appointment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  getUserAppointments: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }
      const appointments = await AppointmentsService.getAppointmentsByUserId(userId);
      if (!appointments || appointments.length === 0) {
        res.status(404).json({ message: "No appointments found for this user" });
        return;
      }
      res.status(200).json(appointments);
    } catch (error) {
      console.error("Error getting user appointments:", error);
      res.status(500).json({ message: "Failed to get user appointments", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  getAppointmentsByMedicalEstablishment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { medicalEstablishmentId } = req.params;
      if (!medicalEstablishmentId) {
        res.status(400).json({ message: "Medical establishment ID is required" });
        return;
      }
      const appointments = await AppointmentsService.getAppointmentsByMedicalEstablishmentId(medicalEstablishmentId);
      res.status(200).json(appointments);
    } catch (error) {
      console.error("Error getting appointments:", error);
      res.status(500).json({ message: "Failed to get appointments", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  updateAppointmentStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId } = req.params;
      const { status } = req.body;

      if (!appointmentId) {
        res.status(400).json({ message: "Appointment ID is required" });
        return;
      }

      if (!status) {
        res.status(400).json({ message: "Status is required in request body" });
        return;
      }

      // Allowed statuses for this endpoint (frontend sends 'confirmed')
      const allowed = ["confirmed"];
      if (!allowed.includes(status)) {
        res.status(400).json({ message: "Invalid status value" });
        return;
      }

      // If authentication middleware attaches a user, capture the id; otherwise undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user: any = (req as any).user;

      const updated = await AppointmentsService.updateAppointmentStatus(appointmentId, status, user?.id);

      if (!updated) {
        res.status(404).json({ message: "Appointment not found" });
        return;
      }

      res.status(200).json({ success: true, data: { appointment: updated } });
    } catch (error) {
      console.error("Error updating appointment status:", error);
      res.status(500).json({ message: "Failed to update appointment status", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
