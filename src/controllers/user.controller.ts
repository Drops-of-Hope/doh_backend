import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import { CreateOrLoginUserRequest, ProfileCompletionRequest } from "../types/user.types.js";

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
};
