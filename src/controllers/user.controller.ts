import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import { CreateOrLoginUserRequest, ProfileCompletionRequest } from "../types/user.types.js";
import { PrismaClient } from "@prisma/client";

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

export const UserController = {
  // POST /api/users/create-or-login
  createOrLoginUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateOrLoginUserRequest = req.body;

      // Validate required fields
      if (!userData.id || !userData.email || !userData.name) {
        res.status(400).json({
          message: "Missing required fields: id, email, and name are required",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        res.status(400).json({
          message: "Invalid email format",
        });
        return;
      }

      const result = await UserService.createOrLoginUser(userData);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in createOrLoginUser:", error);
      res.status(500).json({
        message: "Failed to create or login user",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /api/users/complete-profile
  completeProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const profileData: ProfileCompletionRequest = req.body;

      // Validate required fields
      if (!profileData.userId || !profileData.nic || !profileData.bloodGroup || 
          !profileData.address || !profileData.city || !profileData.district) {
        res.status(400).json({
          message: "Missing required fields: userId, nic, bloodGroup, address, city, and district are required",
        });
        return;
      }

      // Validate NIC format (basic Sri Lankan NIC validation)
      const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
      if (!nicRegex.test(profileData.nic)) {
        res.status(400).json({
          message: "Invalid NIC format",
        });
        return;
      }

      const result = await UserService.completeProfile(profileData);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in completeProfile:", error);
      res.status(500).json({
        message: "Failed to complete profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /api/users/exists/:userId
  checkUserExists: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          message: "User ID is required",
        });
        return;
      }

      const result = await UserService.checkUserExists(userId);
      
      if (!result.exists) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in checkUserExists:", error);
      res.status(500).json({
        message: "Failed to check user existence",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /api/users/:userId
  getUserProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          message: "User ID is required",
        });
        return;
      }

      const user = await UserService.getUserProfile(userId);
      
      if (!user) {
        res.status(404).json({
          message: "User not found",
        });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      res.status(500).json({
        message: "Failed to get user profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /users/profile
  getProfile: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access profile",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userDetails: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          message: "User profile not found",
        });
        return;
      }

      res.status(200).json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          bloodGroup: user.bloodGroup,
          totalDonations: user.totalDonations,
          totalPoints: user.totalPoints,
          profileImageUrl: user.profileImageUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
          userDetails: user.userDetails ? {
            address: user.userDetails.address,
            city: user.userDetails.city,
            district: user.userDetails.district,
            phoneNumber: user.userDetails.phoneNumber,
            emergencyContact: user.userDetails.emergencyContact,
          } : null,
        },
      });
    } catch (error) {
      console.error("Error in getProfile:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get user profile",
      });
    }
  },

  // GET /users/donation-history
  getDonationHistory: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access donation history",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          bloodDonations: {
            orderBy: { endTime: "desc" },
            take: 1,
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          message: "User not found",
        });
        return;
      }

      const lastDonation = user.bloodDonations[0];
      const daysSinceLastDonation = lastDonation
        ? Math.ceil((new Date().getTime() - new Date(lastDonation.endTime).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Check eligibility (56 days between donations)
      const eligibleToDonate = !lastDonation || daysSinceLastDonation! >= 56;
      const nextEligibleDate = lastDonation && !eligibleToDonate
        ? new Date(new Date(lastDonation.endTime).getTime() + 56 * 24 * 60 * 60 * 1000)
        : null;

      res.status(200).json({
        data: {
          totalDonations: user.totalDonations,
          lastDonationDate: lastDonation?.endTime || null,
          daysSinceLastDonation,
          eligibleToDonate,
          nextEligibleDate: nextEligibleDate?.toISOString() || null,
          bloodGroup: user.bloodGroup,
        },
      });
    } catch (error) {
      console.error("Error in getDonationHistory:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get donation history",
      });
    }
  },

  // GET /users/eligibility
  getEligibility: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to check eligibility",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          bloodDonations: {
            orderBy: { endTime: "desc" },
            take: 1,
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          message: "User not found",
        });
        return;
      }

      const lastDonation = user.bloodDonations[0];
      const daysSinceLastDonation = lastDonation
        ? Math.ceil((new Date().getTime() - new Date(lastDonation.endTime).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const eligibleToDonate = !lastDonation || daysSinceLastDonation! >= 56;
      const nextEligibleDate = lastDonation && !eligibleToDonate
        ? new Date(new Date(lastDonation.endTime).getTime() + 56 * 24 * 60 * 60 * 1000)
        : null;

      const reasons = [];
      const recommendations = [];

      if (!eligibleToDonate) {
        reasons.push(`Must wait 56 days between donations. ${56 - daysSinceLastDonation!} days remaining.`);
        recommendations.push("Maintain a healthy diet rich in iron.");
        recommendations.push("Stay hydrated and get adequate rest.");
      } else {
        recommendations.push("You are eligible to donate! Schedule an appointment.");
        recommendations.push("Eat a healthy meal before donating.");
        recommendations.push("Drink plenty of water before and after donation.");
      }

      res.status(200).json({
        data: {
          isEligible: eligibleToDonate,
          nextEligibleDate: nextEligibleDate?.toISOString() || null,
          reasons,
          recommendations,
        },
      });
    } catch (error) {
      console.error("Error in getEligibility:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to check eligibility",
      });
    }
  },

  // PUT /users/profile
  updateProfile: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to update profile",
        });
        return;
      }

      const updateData = req.body;

      // Update user
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.bloodGroup && { bloodGroup: updateData.bloodGroup }),
          ...(updateData.profileImageUrl && { profileImageUrl: updateData.profileImageUrl }),
        },
        include: {
          userDetails: true,
        },
      });

      // Update user details if provided
      if (updateData.address || updateData.city || updateData.phoneNumber || updateData.emergencyContact) {
        await prisma.userDetail.upsert({
          where: { userId },
          update: {
            ...(updateData.address && { address: updateData.address }),
            ...(updateData.city && { city: updateData.city }),
            ...(updateData.phoneNumber && { phoneNumber: updateData.phoneNumber }),
            ...(updateData.emergencyContact && { emergencyContact: updateData.emergencyContact }),
          },
          create: {
            userId,
            address: updateData.address || "",
            city: updateData.city || "",
            district: "COLOMBO", // Default district
            ...(updateData.phoneNumber && { phoneNumber: updateData.phoneNumber }),
            ...(updateData.emergencyContact && { emergencyContact: updateData.emergencyContact }),
          },
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error in updateProfile:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update profile",
      });
    }
  },

  // GET /users/activities
  getActivities: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { limit = "10", recent } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access activities",
        });
        return;
      }

      const limitNum = parseInt(limit as string);
      const whereClause = { userId };

      if (recent === "true") {
        // Get activities from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        Object.assign(whereClause, {
          createdAt: { gte: thirtyDaysAgo },
        });
      }

      const activities = await prisma.activity.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limitNum,
      });

      res.status(200).json({
        data: { activities },
      });
    } catch (error) {
      console.error("Error in getActivities:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get activities",
      });
    }
  },

  // GET /users/notifications
  getNotifications: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { limit = "10" } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access notifications",
        });
        return;
      }

      const limitNum = parseInt(limit as string);

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limitNum,
      });

      res.status(200).json({
        data: { notifications },
      });
    } catch (error) {
      console.error("Error in getNotifications:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get notifications",
      });
    }
  },
};
