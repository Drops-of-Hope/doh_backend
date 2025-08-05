import { prisma } from "../config/db.js";
import { User, UserType } from "@prisma/client";
import { CreateOrLoginUserRequest, ProfileCompletionRequest } from "../types/user.types.js";

export const UserRepository = {
  // Check if user exists by ID
  getUserById: async (id: string): Promise<User | null> => {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        userDetails: true,
      },
    });
  },

  // Check if user exists by email
  getUserByEmail: async (email: string): Promise<User | null> => {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        userDetails: true,
      },
    });
  },

  // Create new user
  createUser: async (userData: CreateOrLoginUserRequest): Promise<User> => {
    return await prisma.user.create({
      data: {
        id: userData.id,
        nic: `temp_${userData.id}`, // Temporary unique NIC until profile completion
        email: userData.email,
        name: userData.name,
        bloodGroup: "O_POSITIVE", // Default value, will be updated during profile completion
        createdAt: new Date(),
        updatedAt: new Date(),
        totalDonations: 0,
        totalPoints: 0,
        donationBadge: "BRONZE",
        isActive: true,
      },
      include: {
        userDetails: true,
      },
    });
  },

  // Update user basic info
  updateUser: async (id: string, updateData: Partial<User>): Promise<User> => {
    return await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        userDetails: true,
      },
    });
  },

  // Complete user profile
  completeProfile: async (profileData: ProfileCompletionRequest): Promise<User> => {
    return await prisma.$transaction(async (tx) => {
      // Update user with NIC and blood group
      await tx.user.update({
        where: { id: profileData.userId },
        data: {
          nic: profileData.nic,
          bloodGroup: profileData.bloodGroup,
          updatedAt: new Date(),
        },
      });

      // Determine user type based on existing roles or default to DONOR
      const userType: UserType = "DONOR";

      // Create or update user details
      await tx.userDetail.upsert({
        where: { userId: profileData.userId },
        update: {
          address: profileData.address,
          city: profileData.city,
          district: profileData.district,
          phoneNumber: profileData.phoneNumber,
          emergencyContact: profileData.emergencyContact,
          type: userType,
        },
        create: {
          userId: profileData.userId,
          address: profileData.address,
          city: profileData.city,
          district: profileData.district,
          phoneNumber: profileData.phoneNumber,
          emergencyContact: profileData.emergencyContact,
          type: userType,
        },
      });

      return await tx.user.findUnique({
        where: { id: profileData.userId },
        include: {
          userDetails: true,
        },
      }) as User;
    });
  },

  // Check if user profile is complete
  isProfileComplete: async (userId: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userDetails: true,
      },
    });

    if (!user) return false;

    // Profile is complete if user has a real NIC (not temporary) and user details exist
    return !!(
      user.nic && 
      !user.nic.startsWith('temp_') && 
      user.nic.trim() !== "" && 
      user.userDetails
    );
  },
};
