import { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { ActivityType } from "@prisma/client";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    bloodGroup?: string;
    nic?: string;
  };
}

export const EmergenciesController = {
  // POST /emergencies - Create new emergency request
  createEmergency: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to create an emergency request",
        });
        return;
      }

      const {
        title,
        description,
        bloodTypesNeeded,
        quantityNeeded,
        urgencyLevel,
        hospitalId,
        expiresAt,
        contactNumber,
        specialInstructions,
      } = req.body;

      // Basic validation
      if (
        !title ||
        !description ||
        !bloodTypesNeeded ||
        !urgencyLevel ||
        !hospitalId ||
        !expiresAt ||
        !contactNumber
      ) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          message:
            "title, description, bloodTypesNeeded, urgencyLevel, hospitalId, expiresAt and contactNumber are required",
        });
        return;
      }

      const expires = new Date(expiresAt);

      const created = await prisma.emergencyRequest.create({
        data: {
          title,
          description,
          bloodTypesNeeded: bloodTypesNeeded,
          quantityNeeded: quantityNeeded || {},
          urgencyLevel,
          hospitalId,
          requestedById: userId,
          expiresAt: expires,
          contactNumber,
          specialInstructions: specialInstructions || null,
        },
      });

      // Create activity
      await prisma.activity.create({
        data: {
          userId,
          type: ActivityType.EMERGENCY_RESPONDED,
          title: "Created Emergency Request",
          description: `Created emergency: ${created.title}`,
          metadata: {
            emergencyId: created.id,
            hospitalId: created.hospitalId,
          },
        },
      });

      // Create notification for the requester
      await prisma.notification.create({
        data: {
          userId,
          type: "EMERGENCY_ALERT",
          title: "Emergency Request Created",
          message: `Your emergency request "${created.title}" has been created successfully.`,
          metadata: { emergencyId: created.id },
        },
      });

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error("Create emergency error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create emergency request",
      });
    }
  },
  // GET /emergencies
  getEmergencies: async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, limit = "5" } = req.query;
      const limitNum = parseInt(limit as string);

      const whereClause = {
        ...(status === "ACTIVE" && { status: "ACTIVE" as const }),
        expiresAt: { gte: new Date() },
      };

      const emergencies = await prisma.emergencyRequest.findMany({
        where: whereClause,
        include: {
          hospital: {
            include: {
              medicalEstablishment: true,
            },
          },
        },
        orderBy: [{ urgencyLevel: "asc" }, { createdAt: "desc" }],
        take: limitNum,
      });

      res.status(200).json({
        data: {
          emergencies: emergencies.map((emergency) => ({
            id: emergency.id,
            title: emergency.title,
            description: emergency.description,
            bloodTypesNeeded: emergency.bloodTypesNeeded,
            urgencyLevel: emergency.urgencyLevel,
            status: emergency.status,
            expiresAt: emergency.expiresAt,
            contactNumber: emergency.contactNumber,
            specialInstructions: emergency.specialInstructions,
            createdAt: emergency.createdAt,
            hospital: {
              id: emergency.hospital.id,
              name: emergency.hospital.name,
              address: emergency.hospital.address,
              district: emergency.hospital.district,
            },
          })),
        },
      });
    } catch (error) {
      console.error("Get emergencies error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch emergencies",
      });
    }
  },

  // POST /emergencies/:id/respond
  respondToEmergency: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { responseType, message, contactInfo } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to respond to emergencies",
        });
        return;
      }

      // Check if emergency exists and is active
      const emergency = await prisma.emergencyRequest.findUnique({
        where: { id },
      });

      if (!emergency) {
        res.status(404).json({
          success: false,
          error: "Emergency not found",
          message: "The specified emergency request does not exist",
        });
        return;
      }

      if (emergency.status !== "ACTIVE") {
        res.status(400).json({
          success: false,
          error: "Emergency not active",
          message: "This emergency request is no longer active",
        });
        return;
      }

      if (emergency.expiresAt <= new Date()) {
        res.status(400).json({
          success: false,
          error: "Emergency expired",
          message: "This emergency request has expired",
        });
        return;
      }

      // Create emergency response
      const response = await prisma.emergencyResponse.create({
        data: {
          emergencyRequestId: id,
          userId,
          responseType,
          message,
          contactInfo,
        },
      });

      // Create activity record
      await prisma.activity.create({
        data: {
          userId,
          type: "EMERGENCY_RESPONDED",
          title: "Responded to Emergency",
          description: `Responded to emergency: ${emergency.title}`,
          metadata: {
            emergencyId: id,
            emergencyTitle: emergency.title,
            responseType,
          },
        },
      });

      // Create notification for the user
      await prisma.notification.create({
        data: {
          userId,
          type: "EMERGENCY_ALERT",
          title: "Emergency Response Submitted",
          message: `Your response to emergency "${emergency.title}" has been submitted successfully.`,
          metadata: {
            emergencyId: id,
            responseId: response.id,
          },
        },
      });

      res.status(200).json({
        success: true,
        responseId: response.id,
      });
    } catch (error) {
      console.error("Respond to emergency error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to respond to emergency",
      });
    }
  },
};
