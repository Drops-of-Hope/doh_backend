import { Request, Response } from "express";
import { AppointmentsService } from "../services/appointments.service.js";
import { PrismaClient } from "@prisma/client";
import { AppointmentWhereClause, AppointmentUpdateData } from "../types/appointment.types.js";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    bloodGroup?: string;
    nic?: string;
  };
}

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

  // GET /appointments/user
  getAuthenticatedUserAppointments: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { status, limit = "10" } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access appointments",
        });
        return;
      }

      const limitNum = parseInt(limit as string);
      const whereClause: AppointmentWhereClause = { donorId: userId };

      if (status === "upcoming") {
        whereClause.appointmentDate = { gte: new Date() };
        whereClause.scheduled = "PENDING";
      }

      const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          medicalEstablishment: true,
          slot: true,
        },
        orderBy: { appointmentDate: "asc" },
        take: limitNum,
      });

      res.status(200).json({
        data: appointments.map(apt => ({
          id: apt.id,
          donorId: apt.donorId,
          appointmentDateTime: apt.appointmentDate,
          scheduled: apt.scheduled,
          location: apt.medicalEstablishment.address,
          notes: null,
          createdAt: apt.appointmentDate,
          medicalEstablishment: {
            id: apt.medicalEstablishment.id,
            name: apt.medicalEstablishment.name,
            address: apt.medicalEstablishment.address,
            district: apt.medicalEstablishment.region,
          },
        })),
      });
    } catch (error) {
      console.error("Error getting authenticated user appointments:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get user appointments",
      });
    }
  },

  // POST /appointments/create
  createAuthenticatedAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { slotId, appointmentDate, medicalEstablishmentId } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to create appointments",
        });
        return;
      }

      if (!slotId || !appointmentDate || !medicalEstablishmentId) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: "slotId, appointmentDate, and medicalEstablishmentId are required",
        });
        return;
      }

      const parsedDate = new Date(appointmentDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({
          success: false,
          error: "Invalid date format",
          message: "Please provide a valid appointment date",
        });
        return;
      }

      if (parsedDate <= new Date()) {
        res.status(400).json({
          success: false,
          error: "Invalid date",
          message: "Appointment date must be in the future",
        });
        return;
      }

      const appointment = await prisma.appointment.create({
        data: {
          donorId: userId,
          slotId,
          appointmentDate: parsedDate,
          medicalEstablishmentId,
          scheduled: "PENDING",
        },
        include: {
          medicalEstablishment: true,
          slot: true,
        },
      });

      // Create activity record
      await prisma.activity.create({
        data: {
          userId,
          type: "APPOINTMENT_SCHEDULED",
          title: "Appointment Scheduled",
          description: `Appointment scheduled for ${parsedDate.toLocaleDateString()}`,
          metadata: {
            appointmentId: appointment.id,
            medicalEstablishmentName: appointment.medicalEstablishment.name,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error("Error creating authenticated appointment:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create appointment",
      });
    }
  },

  // PUT /appointments/:id
  updateAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { slotId, appointmentDate } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to update appointments",
        });
        return;
      }

      // Check if appointment exists and belongs to user
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!existingAppointment) {
        res.status(404).json({
          success: false,
          error: "Appointment not found",
          message: "The specified appointment does not exist",
        });
        return;
      }

      if (existingAppointment.donorId !== userId) {
        res.status(403).json({
          success: false,
          error: "Access denied",
          message: "You can only update your own appointments",
        });
        return;
      }

      if (existingAppointment.scheduled !== "PENDING") {
        res.status(400).json({
          success: false,
          error: "Cannot update appointment",
          message: "Only pending appointments can be updated",
        });
        return;
      }

      const updateData: AppointmentUpdateData = {};
      if (slotId) updateData.slotId = slotId;
      if (appointmentDate) {
        const parsedDate = new Date(appointmentDate);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({
            success: false,
            error: "Invalid date format",
            message: "Please provide a valid appointment date",
          });
          return;
        }
        if (parsedDate <= new Date()) {
          res.status(400).json({
            success: false,
            error: "Invalid date",
            message: "Appointment date must be in the future",
          });
          return;
        }
        updateData.appointmentDate = parsedDate;
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: updateData,
        include: {
          medicalEstablishment: true,
          slot: true,
        },
      });

      res.status(200).json({
        success: true,
        data: updatedAppointment,
      });
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update appointment",
      });
    }
  },

  // DELETE /appointments/:id
  deleteAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to cancel appointments",
        });
        return;
      }

      // Check if appointment exists and belongs to user
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!existingAppointment) {
        res.status(404).json({
          success: false,
          error: "Appointment not found",
          message: "The specified appointment does not exist",
        });
        return;
      }

      if (existingAppointment.donorId !== userId) {
        res.status(403).json({
          success: false,
          error: "Access denied",
          message: "You can only cancel your own appointments",
        });
        return;
      }

      if (existingAppointment.scheduled !== "PENDING") {
        res.status(400).json({
          success: false,
          error: "Cannot cancel appointment",
          message: "Only pending appointments can be cancelled",
        });
        return;
      }

      // Update appointment status to cancelled instead of deleting
      await prisma.appointment.update({
        where: { id },
        data: { scheduled: "CANCELLED" },
      });

      // Create activity record
      await prisma.activity.create({
        data: {
          userId,
          type: "APPOINTMENT_CANCELLED",
          title: "Appointment Cancelled",
          description: `Appointment cancelled for ${existingAppointment.appointmentDate.toLocaleDateString()}`,
          metadata: {
            appointmentId: id,
          },
        },
      });

      res.status(200).json({
        success: true,
      });
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to cancel appointment",
      });
    }
  },
};
