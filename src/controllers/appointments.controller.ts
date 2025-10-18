import { Request, Response } from "express";
import { AppointmentsService } from "../services/appointments.service.js";
import { PrismaClient } from "@prisma/client";
import { AppointmentUpdateData } from "../types/appointment.types.js";

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
      const { status } = req.query;
      
      if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }
      
      // Validate status parameter if provided
      if (status && typeof status === 'string') {
        const validStatuses = ['upcoming', 'completed', 'cancelled'];
        if (!validStatuses.includes(status.toLowerCase())) {
          res.status(400).json({ 
            message: "Invalid status filter. Allowed values: upcoming, completed, cancelled" 
          });
          return;
        }
      }
      
      const appointments = await AppointmentsService.getAppointmentsByUserId(userId, status as string);
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

      const updated = await AppointmentsService.updateAppointmentStatus(appointmentId, status);

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

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access appointments",
        });
        return;
      }

      // include related slot and medicalEstablishment to return richer data
      const appointments = await prisma.appointment.findMany({
        where: { donorId: userId },
        include: {
          medicalEstablishment: true,
          slot: true,
        },
        orderBy: { appointmentDate: "desc" },
      });

      res.status(200).json({
        success: true,
        data: appointments.map(apt => ({
          id: apt.id,
          donorId: apt.donorId,
          scheduled: apt.scheduled,
          appointmentDate: apt.appointmentDate,
          medicalEstablishment: apt.medicalEstablishment ? {
            id: apt.medicalEstablishment.id,
            name: apt.medicalEstablishment.name,
            address: apt.medicalEstablishment.address,
          } : null,
          slot: apt.slot ? {
            id: apt.slot.id,
            startTime: apt.slot.startTime,
            endTime: apt.slot.endTime,
          } : null,
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

      // Check user eligibility
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true, nextEligible: true },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          message: "User account not found",
        });
        return;
      }

      if (!user.isActive) {
        res.status(400).json({
          success: false,
          error: "Account inactive",
          message: "Your account is not active. Please contact support.",
        });
        return;
      }

      if (user.nextEligible && user.nextEligible > parsedDate) {
        res.status(400).json({
          success: false,
          error: "Not eligible for donation",
          message: `You are not eligible to donate until ${user.nextEligible.toLocaleDateString()}`,
        });
        return;
      }

      // Check if medical establishment exists
      const medicalEstablishment = await prisma.medicalEstablishment.findUnique({
        where: { id: medicalEstablishmentId },
      });

      if (!medicalEstablishment) {
        res.status(404).json({
          success: false,
          error: "Medical establishment not found",
          message: "The specified medical establishment does not exist",
        });
        return;
      }

      // Check if slot exists and is available for the specific date
      const slot = await prisma.appointmentSlot.findUnique({
        where: { id: slotId },
        include: {
          appointments: {
            where: {
              appointmentDate: {
                gte: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()),
                lt: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate() + 1),
              },
            },
          },
        },
      });

      if (!slot) {
        res.status(404).json({
          success: false,
          error: "Appointment slot not found",
          message: "The specified appointment slot does not exist",
        });
        return;
      }

      if (!slot.isAvailable) {
        res.status(400).json({
          success: false,
          error: "Slot not available",
          message: "The specified appointment slot is not available",
        });
        return;
      }

      // Check if slot has capacity for the specific date
      if (slot.appointments.length >= slot.donorsPerSlot) {
        res.status(400).json({
          success: false,
          error: "Slot fully booked",
          message: "The specified appointment slot is fully booked for the selected date",
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
            medicalEstablishmentName: medicalEstablishment.name,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: appointment.id,
          donorId: appointment.donorId,
          scheduled: appointment.scheduled,
          appointmentDate: appointment.appointmentDate,
          slotId: appointment.slotId,
          medicalEstablishmentId: appointment.medicalEstablishmentId,
        },
        message: "Appointment created successfully",
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
