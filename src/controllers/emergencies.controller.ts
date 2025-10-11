import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class EmergenciesController {
  /**
   * GET /emergencies
   * Fetch all active emergency requests with filtering options
   */
  static async getEmergencies(req: Request, res: Response) {
    try {
      const {
        status,
        urgencyLevel,
        bloodType,
        hospitalId,
        limit = "20",
        offset = "0"
      } = req.query;

      // Build where clause for filtering
      const where: any = {};

      // Filter by status (default to ACTIVE if not specified)
      if (status) {
        where.status = status;
      } else {
        where.status = "ACTIVE";
      }

      // Filter by urgency level
      if (urgencyLevel) {
        where.urgencyLevel = urgencyLevel;
      }

      // Filter by hospital
      if (hospitalId) {
        where.hospitalId = hospitalId;
      }

      // Filter by blood type (check JSON field)
      if (bloodType) {
        where.bloodTypesNeeded = {
          array_contains: bloodType
        };
      }

      // Only show requests that haven't expired
      where.expiresAt = {
        gte: new Date()
      };

      const emergencies = await prisma.emergencyRequest.findMany({
        where,
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              contactNumber: true
            }
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          responses: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          }
        },
        orderBy: [
          { urgencyLevel: "desc" },
          { createdAt: "desc" }
        ],
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      });

      // Get total count for pagination
      const totalCount = await prisma.emergencyRequest.count({ where });

      return res.status(200).json({
        success: true,
        data: emergencies,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string)
        }
      });
    } catch (error) {
      console.error("Error fetching emergencies:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch emergency requests",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * POST /emergencies/:id/respond
   * Allow authenticated users to respond to an emergency request
   */
  static async respondToEmergency(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id; // From authenticateToken middleware

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const {
        bloodType,
        quantity,
        message,
        availableDate
      } = req.body;

      // Validate required fields
      if (!bloodType || !quantity) {
        return res.status(400).json({
          success: false,
          message: "Blood type and quantity are required"
        });
      }

      // Check if emergency request exists and is active
      const emergencyRequest = await prisma.emergencyRequest.findUnique({
        where: { id },
        include: {
          hospital: true
        }
      });

      if (!emergencyRequest) {
        return res.status(404).json({
          success: false,
          message: "Emergency request not found"
        });
      }

      if (emergencyRequest.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: "This emergency request is no longer active"
        });
      }

      // Check if request has expired
      if (new Date() > emergencyRequest.expiresAt) {
        return res.status(400).json({
          success: false,
          message: "This emergency request has expired"
        });
      }

      // Check if user has already responded
      const existingResponse = await prisma.emergencyResponse.findFirst({
        where: {
          emergencyRequestId: id,
          donorId: userId
        }
      });

      if (existingResponse) {
        return res.status(400).json({
          success: false,
          message: "You have already responded to this emergency request"
        });
      }

      // Verify user's blood type matches (optional - depends on your User model)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { bloodType: true, name: true, contactNumber: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Check if the provided blood type matches needed types
      const bloodTypesNeeded = emergencyRequest.bloodTypesNeeded as string[];
      if (!bloodTypesNeeded.includes(bloodType)) {
        return res.status(400).json({
          success: false,
          message: `Blood type ${bloodType} is not needed for this request`
        });
      }

      // Create emergency response
      const response = await prisma.emergencyResponse.create({
        data: {
          emergencyRequestId: id,
          donorId: userId,
          bloodType,
          quantity: parseInt(quantity),
          message: message || null,
          availableDate: availableDate ? new Date(availableDate) : new Date(),
          status: "PENDING" // Assuming EmergencyResponseStatus has PENDING
        },
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              contactNumber: true
            }
          }
        }
      });

      // TODO: Send notification to hospital/request creator
      // await sendNotificationToHospital(emergencyRequest.hospitalId, response);

      return res.status(201).json({
        success: true,
        message: "Response submitted successfully. The hospital will contact you soon.",
        data: response
      });
    } catch (error) {
      console.error("Error responding to emergency:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit response",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * POST /emergencies (Create new emergency request)
   * You might want to add this route
   */
  static async createEmergency(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const {
        title,
        description,
        bloodTypesNeeded,
        quantityNeeded,
        urgencyLevel,
        hospitalId,
        contactNumber,
        specialInstructions,
        expiresAt
      } = req.body;

      // Validate required fields
      if (!title || !description || !bloodTypesNeeded || !quantityNeeded || 
          !urgencyLevel || !hospitalId || !contactNumber || !expiresAt) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      // Verify hospital exists
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId }
      });

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: "Hospital not found"
        });
      }

      // Create emergency request
      const emergencyRequest = await prisma.emergencyRequest.create({
        data: {
          title,
          description,
          bloodTypesNeeded,
          quantityNeeded,
          urgencyLevel,
          hospitalId,
          requestedById: userId,
          contactNumber,
          specialInstructions,
          expiresAt: new Date(expiresAt),
          status: "ACTIVE"
        },
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          requestedBy: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // TODO: Send notifications to eligible donors
      // await notifyEligibleDonors(emergencyRequest);

      return res.status(201).json({
        success: true,
        message: "Emergency request created successfully",
        data: emergencyRequest
      });
    } catch (error) {
      console.error("Error creating emergency request:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create emergency request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * PATCH /emergencies/:id (Update emergency status)
   * For hospital staff to mark as fulfilled or cancelled
   */
  static async updateEmergencyStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const validStatuses = ["ACTIVE", "FULFILLED", "CANCELLED", "EXPIRED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status"
        });
      }

      const emergencyRequest = await prisma.emergencyRequest.findUnique({
        where: { id }
      });

      if (!emergencyRequest) {
        return res.status(404).json({
          success: false,
          message: "Emergency request not found"
        });
      }

      // Only request creator can update status
      if (emergencyRequest.requestedById !== userId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this request"
        });
      }

      const updatedRequest = await prisma.emergencyRequest.update({
        where: { id },
        data: {
          status,
          fulfilledAt: status === "FULFILLED" ? new Date() : null
        }
      });

      return res.status(200).json({
        success: true,
        message: "Emergency request updated successfully",
        data: updatedRequest
      });
    } catch (error) {
      console.error("Error updating emergency request:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update emergency request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}