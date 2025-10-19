import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import { CreateOrLoginUserRequest, ProfileCompletionRequest } from "../types/user.types.js";
import { AuthenticatedRequest } from "../types/auth.types.js";
import { PrismaClient, ActivityType, BloodGroup, District, Prisma, NotificationType } from "@prisma/client";
import jwt from "jsonwebtoken";
import AsgardeoService from "../services/asgardeo.service.js";

const prisma = new PrismaClient();

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

  // POST /api/users/request-campaign-organizer-role
  requestCampaignOrganizerRole: async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          error: "UNAUTHORIZED",
        });
        return;
      }

      // Decode token to extract Asgardeo subject and roles/groups
      const decodedUnknown = jwt.decode(token);
      if (!decodedUnknown || typeof decodedUnknown !== "object") {
        res.status(401).json({
          success: false,
          message: "Invalid token",
          error: "UNAUTHORIZED",
        });
        return;
      }

      const decoded = decodedUnknown as {
        sub?: string;
        roles?: unknown;
        groups?: unknown;
        scope?: unknown;
      };

      const userSub = decoded.sub;
      if (!userSub) {
        res.status(400).json({
          success: false,
          message: "User identifier not found in token",
          error: "MALFORMED_TOKEN",
        });
        return;
      }

      // For now, accept any authenticated user with a valid token and sub
      // Role checking will be done via SCIM API below
      console.log("✅ User authenticated with sub:", userSub);
      console.log("📋 Token scope:", decoded.scope);
      console.log("📋 Token roles claim:", decoded.roles);
      console.log("📋 Token groups claim:", decoded.groups);

      // Get M2M management token for administrative operations
      // User's token is used for authentication, M2M token for role assignment
      console.log("🔐 Obtaining M2M management token...");
      const mgmtToken = await AsgardeoService.getManagementAccessToken("internal_role_mgt_update internal_role_mgt_view internal_user_mgt_view");

      // Check via SCIM if user already has the role
      try {
        const scimUserUnknown = await AsgardeoService.getScimUser(userSub, mgmtToken);
        const scimRoles: string[] = (() => {
          if (scimUserUnknown && typeof scimUserUnknown === "object") {
            const rolesVal = (scimUserUnknown as Record<string, unknown>)["roles"];
            if (Array.isArray(rolesVal)) {
              return rolesVal
                .map((r) =>
                  r && typeof r === "object" && "display" in (r as Record<string, unknown>)
                    ? (r as Record<string, unknown>)["display"]
                    : undefined
                )
                .filter((v): v is string => typeof v === "string");
            }
          }
          return [];
        })();
        if (scimRoles.includes("Internal/CampaignOrg")) {
          res.status(400).json({
            success: false,
            message: "User already has Campaign Organizer role",
            error: "ROLE_ALREADY_ASSIGNED",
          });
          return;
        }
      } catch {
        // Continue; inability to fetch should not block assignment attempt if token is valid
      }

      console.log("🎯 Assigning CampaignOrg role to user:", userSub);
      await AsgardeoService.assignCampaignOrganizer(userSub, mgmtToken, "Internal/CampaignOrg");

      res.status(200).json({
        success: true,
        message: "Campaign Organizer role assigned successfully",
        role: "Internal/CampaignOrg",
      });
    } catch (error) {
      console.error("Assign Campaign Organizer role error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to assign role via Asgardeo",
        error: "ASGARDEO_API_ERROR",
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
      
      // Handle specific case where user doesn't exist
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({
          message: "User not found",
          error: error.message,
          suggestion: "Please login again to create your account",
        });
        return;
      }
      
      res.status(500).json({
        message: "Failed to complete profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /api/users/complete-profile-auth (authenticated version)
  completeProfileAuthenticated: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const profileData = req.body;
      const authenticatedUser = req.user;

      if (!authenticatedUser) {
        res.status(401).json({
          message: "Authentication required",
        });
        return;
      }

      // Enhance profile data with authenticated user information
      const enhancedProfileData: ProfileCompletionRequest = {
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        ...profileData,
      };

      // Validate required fields
      if (!enhancedProfileData.nic || !enhancedProfileData.bloodGroup || 
          !enhancedProfileData.address || !enhancedProfileData.city || !enhancedProfileData.district) {
        res.status(400).json({
          message: "Missing required fields: nic, bloodGroup, address, city, and district are required",
        });
        return;
      }

      // Validate NIC format (basic Sri Lankan NIC validation)
      const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
      if (!nicRegex.test(enhancedProfileData.nic)) {
        res.status(400).json({
          message: "Invalid NIC format",
        });
        return;
      }

      const result = await UserService.completeProfile(enhancedProfileData);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in completeProfileAuthenticated:", error);
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access donation history",
        });
        return;
      }

      const skip = (page - 1) * limit;
      
      // Build where clause for filtering
      const where = { userId };
      if (status && ['completed', 'pending', 'cancelled'].includes(status)) {
        // Since our schema doesn't have status field, we'll consider all as completed for now
        // This can be enhanced when schema is updated
      }

      // Get user and donation data
      const [user, totalDonations, bloodDonations, campaignParticipations] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            totalDonations: true,
            totalPoints: true,
            donationBadge: true,
          },
        }),
        prisma.bloodDonation.count({ where }),
        prisma.bloodDonation.findMany({
          where,
          orderBy: { endTime: "desc" },
          skip,
          take: limit,
          include: {
            bloodDonationForm: {
              include: {
                appointment: {
                  include: {
                    medicalEstablishment: {
                      select: {
                        name: true,
                        address: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.campaignParticipation.findMany({
          where: {
            userId,
            donationCompleted: true,
          },
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                location: true,
              },
            },
          },
        }),
      ]);

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          message: "User not found",
        });
        return;
      }

      // Map donations to response format
      const donations = bloodDonations.map((donation) => {
        const appointment = donation.bloodDonationForm?.appointment;
        const medicalEstablishment = appointment?.medicalEstablishment;
        
        // Find associated campaign participation
        const campaignParticipation = campaignParticipations.find(
          (p) => p.scannedAt && 
          Math.abs(new Date(p.scannedAt).getTime() - new Date(donation.endTime).getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
        );

        return {
          id: donation.id,
          date: donation.endTime.toISOString(),
          location: medicalEstablishment?.name || campaignParticipation?.campaign?.location || "Unknown Location",
          type: "blood" as const, // Default to blood for now
          status: "completed" as const, // All existing donations are completed
          volume: "450ml", // Standard blood donation volume
          campaign: campaignParticipation?.campaign ? {
            id: campaignParticipation.campaign.id,
            title: campaignParticipation.campaign.title,
          } : undefined,
          medicalEstablishment: {
            name: medicalEstablishment?.name || "Unknown Medical Facility",
            address: medicalEstablishment?.address || "Address not available",
          },
          healthMetrics: {
            // These would come from blood donation form in a complete implementation
            hemoglobin: undefined,
            bloodPressure: undefined,
            weight: undefined,
            pulse: undefined,
          },
          points: donation.pointsEarned,
          notes: undefined,
        };
      });

      // Calculate pagination
      const totalPages = Math.ceil(totalDonations / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      // Calculate donation stats
      const totalVolume = totalDonations * 450; // Assuming 450ml per donation
      const donorLevel = user.donationBadge; // Map to string
      const currentStreak = 0; // Would need additional logic to calculate
      const longestStreak = 0; // Would need additional logic to calculate

      res.status(200).json({
        donations,
        stats: {
          totalDonations: user.totalDonations,
          totalVolume,
          donorLevel,
          pointsEarned: user.totalPoints,
          currentStreak,
          longestStreak,
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalDonations,
          hasNext,
          hasPrev,
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

      // Update user table fields
      const userUpdateData: {
        name?: string;
        bloodGroup?: BloodGroup;
        profileImageUrl?: string;
      } = {};
      if (updateData.name) userUpdateData.name = updateData.name;
      if (updateData.bloodGroup) userUpdateData.bloodGroup = updateData.bloodGroup;
      if (updateData.profileImageUrl) userUpdateData.profileImageUrl = updateData.profileImageUrl;

      let user;
      if (Object.keys(userUpdateData).length > 0) {
        user = await prisma.user.update({
          where: { id: userId },
          data: userUpdateData,
          include: {
            userDetails: true,
          },
        });
      } else {
        // If no user fields to update, just fetch the user
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            userDetails: true,
          },
        });
      }

      // Handle UserDetail fields (address, city, district, phoneNumber, emergencyContact, allergies, medicalConditions)
      const userDetailFields = [
        'address', 'city', 'district', 'phoneNumber', 'emergencyContact', 'allergies', 'medicalConditions'
      ];
      
      const hasUserDetailUpdates = userDetailFields.some(field => updateData[field] !== undefined);

      if (hasUserDetailUpdates) {
        const userDetailUpdateData: {
          address?: string;
          city?: string;
          district?: District;
          phoneNumber?: string;
          emergencyContact?: string;
          allergies?: Prisma.InputJsonValue;
          medicalConditions?: Prisma.InputJsonValue;
        } = {};
        const userDetailCreateData: {
          userId: string;
          address: string;
          city: string;
          district: District;
          phoneNumber?: string;
          emergencyContact?: string;
          allergies?: Prisma.InputJsonValue;
          medicalConditions?: Prisma.InputJsonValue;
        } = {
          userId,
          address: "",
          city: "",
          district: "COLOMBO", // Default district
        };

        // Prepare update data (only include fields that are provided)
        if (updateData.address !== undefined) {
          userDetailUpdateData.address = updateData.address;
          userDetailCreateData.address = updateData.address || "";
        }
        if (updateData.city !== undefined) {
          userDetailUpdateData.city = updateData.city;
          userDetailCreateData.city = updateData.city || "";
        }
        if (updateData.district !== undefined) {
          userDetailUpdateData.district = updateData.district;
          userDetailCreateData.district = updateData.district;
        }
        if (updateData.phoneNumber !== undefined) {
          userDetailUpdateData.phoneNumber = updateData.phoneNumber;
          if (updateData.phoneNumber) userDetailCreateData.phoneNumber = updateData.phoneNumber;
        }
        if (updateData.emergencyContact !== undefined) {
          userDetailUpdateData.emergencyContact = updateData.emergencyContact;
          if (updateData.emergencyContact) userDetailCreateData.emergencyContact = updateData.emergencyContact;
        }
        if (updateData.allergies !== undefined) {
          userDetailUpdateData.allergies = updateData.allergies;
          if (updateData.allergies) userDetailCreateData.allergies = updateData.allergies;
        }
        if (updateData.medicalConditions !== undefined) {
          userDetailUpdateData.medicalConditions = updateData.medicalConditions;
          if (updateData.medicalConditions) userDetailCreateData.medicalConditions = updateData.medicalConditions;
        }

        // Use upsert to either update existing record or create new one
        await prisma.userDetail.upsert({
          where: { userId },
          update: userDetailUpdateData,
          create: userDetailCreateData,
        });

        // Fetch updated user with userDetails
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            userDetails: true,
          },
        });
      }

      res.status(200).json({
        success: true,
        data: user,
        message: "Profile updated successfully",
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
      const { 
        limit = "10", 
        offset = "0",
        type,
        startDate,
        endDate,
        recent 
      } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access activities",
        });
        return;
      }

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);

      // Build filter options
      const options: {
        limit: number;
        offset: number;
        type?: ActivityType;
        startDate?: Date;
        endDate?: Date;
      } = {
        limit: limitNum,
        offset: offsetNum,
      };

      if (type) {
        options.type = type as ActivityType;
      }

      if (recent === "true") {
        // Get activities from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        options.startDate = thirtyDaysAgo;
        options.endDate = new Date();
      } else if (startDate && endDate) {
        options.startDate = new Date(startDate as string);
        options.endDate = new Date(endDate as string);
      }

      // Use ActivityService to get activities with proper filtering
      const { ActivityService } = await import("../services/activity.service.js");
      const result = await ActivityService.getUserActivities(userId, options);

      // Get activity stats
      const stats = await ActivityService.getActivityStats(userId);

      res.status(200).json({
        success: true,
        data: {
          activities: result.activities,
          stats,
          pagination: {
            currentPage: Math.floor(offsetNum / limitNum) + 1,
            totalItems: result.total,
            hasMore: result.hasMore,
            limit: limitNum,
            offset: offsetNum,
          },
        },
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
      const { limit = "10", type, isRead } = req.query as {
        limit?: string;
        type?: string;
        isRead?: string;
      };

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access notifications",
        });
        return;
      }

      const limitNum = Math.max(1, parseInt(limit as string));

      const where: Prisma.NotificationWhereInput = { userId } as Prisma.NotificationWhereInput;
      if (type) {
        // Cast only if matches known enum value
        where.type = type as unknown as NotificationType;
      }
      if (typeof isRead === "string") {
        if (isRead === "true") where.isRead = true;
        if (isRead === "false") where.isRead = false;
      }

      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limitNum,
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            isRead: true,
            createdAt: true,
            metadata: true,
          },
        }),
        prisma.notification.count({ where: { userId, isRead: false } }),
      ]);

      res.status(200).json({
        notifications,
        unreadCount,
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

  // POST /users/:userId/donation-completed - Update user stats after donation
  updateDonationStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { pointsEarned = 100 } = req.body;

      if (!userId) {
        res.status(400).json({
          message: "User ID is required",
        });
        return;
      }

      const result = await UserService.updateDonationStats(userId, pointsEarned);
      
      res.status(200).json({
        message: "Donation stats updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error in updateDonationStats:", error);
      res.status(500).json({
        message: "Failed to update donation stats",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /users/:userId/badge-info - Get badge information for user
  getBadgeInfo: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          message: "User ID is required",
        });
        return;
      }

      const badgeInfo = await UserService.getUserBadgeInfo(userId);
      
      res.status(200).json({
        data: badgeInfo,
      });
    } catch (error) {
      console.error("Error in getBadgeInfo:", error);
      res.status(500).json({
        message: "Failed to get badge information",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /users/appointments
  getUserAppointments: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access appointments",
        });
        return;
      }

      const skip = (page - 1) * limit;
      
      // Build where clause
      const where = { donorId: userId };

      const [totalAppointments, appointments] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          orderBy: { appointmentDate: "desc" },
          skip,
          take: limit,
          include: {
            medicalEstablishment: {
              select: {
                id: true,
                name: true,
                address: true,
                email: true,
              },
            },
            slot: {
              select: {
                startTime: true,
                endTime: true,
              },
            },
          },
        }),
      ]);

      // Map appointments to response format
      const mappedAppts = appointments.map((apt) => {
        const timeString = apt.slot?.startTime || '09:00';

        return {
          id: apt.id,
          hospital: apt.medicalEstablishment.name,
          date: apt.appointmentDate.toISOString(),
          time: timeString,
          location: apt.medicalEstablishment.address,
          confirmationId: apt.id, // Using appointment ID as confirmation ID
          status: apt.scheduled.toLowerCase() as 'upcoming' | 'confirmed' | 'completed' | 'cancelled',
          type: 'blood_donation' as const,
          notes: undefined,
          medicalEstablishment: {
            id: apt.medicalEstablishment.id,
            name: apt.medicalEstablishment.name,
            address: apt.medicalEstablishment.address,
            contactNumber: apt.medicalEstablishment.email || 'Not available',
          },
          campaign: undefined, // Would need to link campaigns to appointments in schema
          createdAt: apt.appointmentDate.toISOString(),
          updatedAt: apt.appointmentDate.toISOString(),
        };
      });

      // Calculate pagination
      const totalPages = Math.ceil(totalAppointments / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      res.status(200).json({
        appointments: mappedAppts,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalAppointments,
          hasNext,
          hasPrev,
        },
      });
    } catch (error) {
      console.error("Error in getUserAppointments:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get user appointments",
      });
    }
  },

  // GET /users/:userId/donations - Public route for specific user donations
  getDonationHistoryByUserId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "User ID is required",
          message: "Please provide a valid user ID",
        });
        return;
      }

      const skip = (page - 1) * limit;
      
      // Build where clause for filtering
      const where = { userId };

      // Get user and donation data
      const [user, totalDonations, bloodDonations, campaignParticipations] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            totalDonations: true,
            totalPoints: true,
            donationBadge: true,
          },
        }),
        prisma.bloodDonation.count({ where }),
        prisma.bloodDonation.findMany({
          where,
          orderBy: { endTime: "desc" },
          skip,
          take: limit,
          include: {
            bloodDonationForm: {
              include: {
                appointment: {
                  include: {
                    medicalEstablishment: {
                      select: {
                        name: true,
                        address: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.campaignParticipation.findMany({
          where: {
            userId,
            donationCompleted: true,
          },
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                location: true,
              },
            },
          },
        }),
      ]);

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          message: "User not found",
        });
        return;
      }

      // Map donations to response format
      const donations = bloodDonations.map((donation) => {
        const appointment = donation.bloodDonationForm?.appointment;
        const medicalEstablishment = appointment?.medicalEstablishment;
        
        // Find associated campaign participation
        const campaignParticipation = campaignParticipations.find(
          (p) => p.scannedAt && 
          Math.abs(new Date(p.scannedAt).getTime() - new Date(donation.endTime).getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
        );

        return {
          id: donation.id,
          date: donation.endTime.toISOString(),
          location: medicalEstablishment?.name || campaignParticipation?.campaign?.location || "Unknown Location",
          type: "blood" as const, // Default to blood for now
          status: "completed" as const, // All existing donations are completed
          volume: "450ml", // Standard blood donation volume
          campaign: campaignParticipation?.campaign ? {
            id: campaignParticipation.campaign.id,
            title: campaignParticipation.campaign.title,
          } : undefined,
          medicalEstablishment: {
            name: medicalEstablishment?.name || "Unknown Medical Facility",
            address: medicalEstablishment?.address || "Address not available",
          },
          healthMetrics: {
            // These would come from blood donation form in a complete implementation
            hemoglobin: undefined,
            bloodPressure: undefined,
            weight: undefined,
            pulse: undefined,
          },
          points: donation.pointsEarned,
          notes: undefined,
        };
      });

      // Calculate pagination
      const totalPages = Math.ceil(totalDonations / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      // Calculate donation stats
      const totalVolume = totalDonations * 450; // Assuming 450ml per donation
      const donorLevel = user.donationBadge; // Map to string
      const currentStreak = 0; // Would need additional logic to calculate
      const longestStreak = 0; // Would need additional logic to calculate

      res.status(200).json({
        donations,
        stats: {
          totalDonations: user.totalDonations,
          totalVolume,
          donorLevel,
          pointsEarned: user.totalPoints,
          currentStreak,
          longestStreak,
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalDonations,
          hasNext,
          hasPrev,
        },
      });
    } catch (error) {
      console.error("Error in getDonationHistoryByUserId:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get donation history",
      });
    }
  },

  // GET /users/:userId/appointments - Public route for specific user appointments
  getUserAppointmentsByUserId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "User ID is required",
          message: "Please provide a valid user ID",
        });
        return;
      }

      const skip = (page - 1) * limit;
      
      // Build where clause
      const where = { donorId: userId };

      const [totalAppointments, appointments] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          orderBy: { appointmentDate: "desc" },
          skip,
          take: limit,
          include: {
            medicalEstablishment: {
              select: {
                id: true,
                name: true,
                address: true,
                email: true,
              },
            },
            slot: {
              select: {
                startTime: true,
                endTime: true,
              },
            },
          },
        }),
      ]);

      // Map appointments to response format
      const mappedAppts = appointments.map((apt) => {
        const timeString = apt.slot?.startTime || '09:00';

        return {
          id: apt.id,
          hospital: apt.medicalEstablishment.name,
          date: apt.appointmentDate.toISOString(),
          time: timeString,
          location: apt.medicalEstablishment.address,
          confirmationId: apt.id, // Using appointment ID as confirmation ID
          status: apt.scheduled.toLowerCase() as 'upcoming' | 'confirmed' | 'completed' | 'cancelled',
          type: 'blood_donation' as const,
          notes: undefined,
          medicalEstablishment: {
            id: apt.medicalEstablishment.id,
            name: apt.medicalEstablishment.name,
            address: apt.medicalEstablishment.address,
            contactNumber: apt.medicalEstablishment.email || 'Not available',
          },
          campaign: undefined, // Would need to link campaigns to appointments in schema
          createdAt: apt.appointmentDate.toISOString(),
          updatedAt: apt.appointmentDate.toISOString(),
        };
      });

      // Calculate pagination
      const totalPages = Math.ceil(totalAppointments / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      res.status(200).json({
        appointments: mappedAppts,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalAppointments,
          hasNext,
          hasPrev,
        },
      });
    } catch (error) {
      console.error("Error in getUserAppointmentsByUserId:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get user appointments",
      });
    }
  },
};
