import { BloodGroup, District, DonationBadge } from "@prisma/client";

// Auth provider data structure
export interface AuthUserData {
  birthdate: string;
  email: string;
  family_name: string;
  given_name: string;
  roles: string[];
  sub: string; // This will be our User.id
  updated_at: number;
  username: string;
}

// User creation/login request
export interface CreateOrLoginUserRequest {
  id: string; // sub from auth provider
  email: string;
  name: string;
  authProvider: string;
  authProviderId: string;
  roles: string[];
  birthdate: string;
  username: string;
  lastAuthUpdate: string;
}

// Profile completion request
export interface ProfileCompletionRequest {
  userId: string;
  nic: string;
  bloodGroup: BloodGroup;
  address: string;
  city: string;
  district: District;
  phoneNumber?: string;
  emergencyContact?: string;
}

// User response for frontend
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  bloodGroup?: BloodGroup;
  isProfileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalDonations: number;
  totalPoints: number;
  donationBadge: DonationBadge;
  isActive: boolean;
}

// Complete response with flags
export interface UserCreateResponse {
  user: UserResponse;
  isNewUser: boolean;
  needsProfileCompletion: boolean;
}

// User existence check
export interface UserExistsResponse {
  exists: boolean;
}
