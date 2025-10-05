import { UserRepository } from "../repositories/user.repository.js";
import { 
  CreateOrLoginUserRequest, 
  ProfileCompletionRequest, 
  UserCreateResponse, 
  UserResponse,
  UserExistsResponse
} from "../types/user.types.js";
import { BadgeService } from "./badge.service.js";
import { ActivityService } from "./activity.service.js";
import { prisma } from "../config/db.js";

export const UserService = {
  // Create user if not exists, or return existing user
  createOrLoginUser: async (userData: CreateOrLoginUserRequest): Promise<UserCreateResponse> => {
    // Check if user already exists
    let user = await UserRepository.getUserById(userData.id);
    let isNewUser = false;

    if (!user) {
      // User doesn't exist, create new user
      user = await UserRepository.createUser(userData);
      isNewUser = true;
    }

    // Check if profile is complete
    const isProfileComplete = await UserRepository.isProfileComplete(user.id);
    const needsProfileCompletion = !isProfileComplete;

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      bloodGroup: user.bloodGroup,
      isProfileComplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      totalDonations: user.totalDonations,
      totalPoints: user.totalPoints,
      donationBadge: user.donationBadge,
      isActive: user.isActive,
    };

    return {
      user: userResponse,
      isNewUser,
      needsProfileCompletion,
    };
  },

  // Complete user profile
  completeProfile: async (profileData: ProfileCompletionRequest): Promise<UserCreateResponse> => {
    const user = await UserRepository.completeProfile(profileData);
    const isProfileComplete = await UserRepository.isProfileComplete(user.id);

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      bloodGroup: user.bloodGroup,
      isProfileComplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      totalDonations: user.totalDonations,
      totalPoints: user.totalPoints,
      donationBadge: user.donationBadge,
      isActive: user.isActive,
    };

    return {
      user: userResponse,
      isNewUser: false,
      needsProfileCompletion: !isProfileComplete,
    };
  },

  // Check if user exists
  checkUserExists: async (userId: string): Promise<UserExistsResponse> => {
    const user = await UserRepository.getUserById(userId);
    return { exists: !!user };
  },

  // Get user profile
  getUserProfile: async (userId: string): Promise<UserResponse | null> => {
    const user = await UserRepository.getUserById(userId);
    
    if (!user) {
      return null;
    }

    const isProfileComplete = await UserRepository.isProfileComplete(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      bloodGroup: user.bloodGroup,
      isProfileComplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      totalDonations: user.totalDonations,
      totalPoints: user.totalPoints,
      donationBadge: user.donationBadge,
      isActive: user.isActive,
    };
  },

  // Utility function to determine user role from auth provider roles
  getUserRole: (roles: string[]): string => {
    if (roles.includes('Internal/CampaignOrg')) {
      return 'CAMP_ORGANIZER';
    }
    if (roles.includes('Internal/Admin')) {
      return 'ADMIN';
    }
    if (roles.includes('Internal/Staff')) {
      return 'STAFF';
    }
    return 'DONOR'; // Default role
  },

  // Update user donation stats and badge after a successful donation
  updateDonationStats: async (
    userId: string, 
    pointsEarned: number = 100,
    donationData?: {
      campaignTitle?: string;
      location?: string;
      bloodType?: string;
      volume?: number;
    }
  ): Promise<{ user: UserResponse; badgePromoted: boolean; oldBadge?: string; newBadge?: string }> => {
    // Get current user data
    const currentUser = await UserRepository.getUserById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const oldBadge = currentUser.donationBadge;
    const newTotalDonations = currentUser.totalDonations + 1;
    const newTotalPoints = currentUser.totalPoints + pointsEarned;

    // Calculate new badge based on total donations
    const newBadge = BadgeService.calculateBadge(newTotalDonations);
    const badgePromoted = BadgeService.isPromotion(oldBadge, newBadge);

    // Update user stats in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        totalDonations: newTotalDonations,
        totalPoints: newTotalPoints,
        donationBadge: newBadge,
        updatedAt: new Date(),
      },
    });

    // Also update UserHomeStats if it exists
    await prisma.userHomeStats.upsert({
      where: { userId },
      update: {
        totalDonations: newTotalDonations,
        totalPoints: newTotalPoints,
        lastDonationDate: new Date(),
        lastUpdated: new Date(),
      },
      create: {
        userId,
        totalDonations: newTotalDonations,
        totalPoints: newTotalPoints,
        lastDonationDate: new Date(),
        donationStreak: 1,
        eligibleToDonate: false, // Set to false right after donation
        lastUpdated: new Date(),
      },
    });

    // Create donation completed activity
    try {
      await ActivityService.createDonationActivity(userId, {
        campaignTitle: donationData?.campaignTitle,
        location: donationData?.location,
        bloodType: donationData?.bloodType || currentUser.bloodGroup || undefined,
        volume: donationData?.volume,
        pointsEarned,
      });

      // Create points earned activity
      await ActivityService.createPointsEarnedActivity(userId, {
        pointsEarned,
        totalPoints: newTotalPoints,
        reason: "Blood donation completed",
      });

      // Create badge promotion activity if promoted
      if (badgePromoted) {
        await ActivityService.createBadgeEarnedActivity(userId, {
          oldBadge,
          newBadge,
          totalDonations: newTotalDonations,
        });
      }
    } catch (error) {
      console.error("Error creating activities:", error);
      // Don't fail the donation if activity creation fails
    }

    const isProfileComplete = await UserRepository.isProfileComplete(updatedUser.id);

    const userResponse: UserResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      bloodGroup: updatedUser.bloodGroup,
      isProfileComplete,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      totalDonations: updatedUser.totalDonations,
      totalPoints: updatedUser.totalPoints,
      donationBadge: updatedUser.donationBadge,
      isActive: updatedUser.isActive,
    };

    return {
      user: userResponse,
      badgePromoted,
      oldBadge: badgePromoted ? oldBadge : undefined,
      newBadge: badgePromoted ? newBadge : undefined,
    };
  },

  // Get badge information for a user
  getUserBadgeInfo: async (userId: string) => {
    const user = await UserRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const badgeInfo = BadgeService.getBadgeDisplayInfo(user.donationBadge);
    const nextBadgeInfo = BadgeService.getNextBadgeInfo(user.donationBadge, user.totalDonations);

    return {
      currentBadge: {
        ...badgeInfo,
        badge: user.donationBadge,
      },
      nextBadge: nextBadgeInfo,
      totalDonations: user.totalDonations,
      allBadges: BadgeService.getAllBadgeThresholds(),
    };
  },
};
