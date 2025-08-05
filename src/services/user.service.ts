import { UserRepository } from "../repositories/user.repository.js";
import { 
  CreateOrLoginUserRequest, 
  ProfileCompletionRequest, 
  UserCreateResponse, 
  UserResponse,
  UserExistsResponse
} from "../types/user.types.js";

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
};
