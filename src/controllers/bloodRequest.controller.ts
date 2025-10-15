import { Request, Response } from "express";
import { PrismaClient, RequestStatus } from "@prisma/client";
import { prisma } from "../config/db.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    bloodGroup?: string;
    nic?: string;
    userDetails?: {
      type: string;
    };
  };
}

export class BloodRequestController {
  /**
   * POST /blood-requests
   * Create a new blood request
   */
  static async createBloodRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
        return;
      }

      const {
        bloodTypeAndAmount,
        bloodId,
        bloodBankId
      } = req.body;

      // Validate required fields
      if (!bloodTypeAndAmount || !bloodId) {
        res.status(400).json({
          success: false,
          message: "bloodTypeAndAmount and bloodId are required fields"
        });
        return;
      }

      // Validate bloodTypeAndAmount structure
      if (typeof bloodTypeAndAmount !== "object") {
        res.status(400).json({
          success: false,
          message: "bloodTypeAndAmount must be a valid JSON object"
        });
        return;
      }

      // Check if blood exists
      const bloodExists = await prisma.blood.findUnique({
        where: { id: bloodId }
      });

      if (!bloodExists) {
        res.status(404).json({
          success: false,
          message: "Blood record not found"
        });
        return;
      }

      // Check if blood bank exists (if provided)
      if (bloodBankId) {
        const bloodBankExists = await prisma.bloodBank.findUnique({
          where: { id: bloodBankId }
        });

        if (!bloodBankExists) {
          res.status(404).json({
            success: false,
            message: "Blood bank not found"
          });
          return;
        }
      }

      // Create blood request
      const newBloodRequest = await prisma.bloodRequest.create({
        data: {
          requestedDateTime: new Date(),
          bloodTypeAndAmount,
          status: RequestStatus.PENDING,
          bloodId,
          bloodBankId: bloodBankId || null
        },
        include: {
          blood: true,
          bloodBank: {
            select: {
              id: true,
              name: true,
              address: true,
              district: true,
              email: true
            }
          },
          bloodTransits: true
        }
      });

      res.status(201).json({
        success: true,
        message: "Blood request created successfully",
        data: newBloodRequest
      });
    } catch (error) {
      console.error("Error creating blood request:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create blood request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * GET /blood-requests
   * Fetch all blood requests with filtering options
   */
  static async getBloodRequests(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        bloodBankId,
        limit = "20",
        offset = "0"
      } = req.query;

      // Build where clause for filtering
      const where: any = {};

      if (status) {
        where.status = status as RequestStatus;
      }

      if (bloodBankId) {
        where.bloodBankId = bloodBankId;
      }

      const bloodRequests = await prisma.bloodRequest.findMany({
        where,
        include: {
          blood: true,
          bloodBank: {
            select: {
              id: true,
              name: true,
              address: true,
              district: true,
              email: true
            }
          },
          bloodTransits: {
            select: {
              id: true,
              transitStatus: true,
              dispatchDateTime: true,
              deliveryDateTime: true,
              deliveryVehicle: true
            }
          }
        },
        orderBy: {
          requestedDateTime: "desc"
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      });

      // Get total count for pagination
      const totalCount = await prisma.bloodRequest.count({ where });

      res.status(200).json({
        success: true,
        data: bloodRequests,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string)
        }
      });
    } catch (error) {
      console.error("Error fetching blood requests:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch blood requests",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * GET /blood-requests/:id
   * Fetch a single blood request by ID
   */
  static async getBloodRequestById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const bloodRequest = await prisma.bloodRequest.findUnique({
        where: { id },
        include: {
          blood: true,
          bloodBank: true,
          bloodTransits: {
            orderBy: {
              dispatchDateTime: "desc"
            }
          }
        }
      });

      if (!bloodRequest) {
        res.status(404).json({
          success: false,
          message: "Blood request not found"
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: bloodRequest
      });
    } catch (error) {
      console.error("Error fetching blood request:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch blood request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * PATCH /blood-requests/:id/status
   * Update blood request status
   */
  static async updateBloodRequestStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
        return;
      }

      // Validate status
      if (!Object.values(RequestStatus).includes(status as RequestStatus)) {
        res.status(400).json({
          success: false,
          message: "Invalid status"
        });
        return;
      }

      const bloodRequest = await prisma.bloodRequest.findUnique({
        where: { id }
      });

      if (!bloodRequest) {
        res.status(404).json({
          success: false,
          message: "Blood request not found"
        });
        return;
      }

      const updatedRequest = await prisma.bloodRequest.update({
        where: { id },
        data: {
          status: status as RequestStatus
        },
        include: {
          blood: true,
          bloodBank: true,
          bloodTransits: {
            orderBy: {
              dispatchDateTime: "desc"
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        message: "Blood request updated successfully",
        data: updatedRequest
      });
    } catch (error) {
      console.error("Error updating blood request:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update blood request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}