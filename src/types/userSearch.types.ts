export interface UserSearchFilters {
  q?: string; // Search query
  bloodGroup?: string;
  eligibleOnly?: boolean;
  minDonations?: number;
  page?: number;
  limit?: number;
  district?: string;
  city?: string;
  isActive?: boolean;
}

export interface DonorSearchResult {
  id: string;
  name: string;
  email: string;
  nic: string;
  bloodGroup: string;
  totalDonations: number;
  totalPoints: number;
  isActive: boolean;
  nextEligible?: Date;
  profileImageUrl?: string;
  userDetails?: {
    phoneNumber?: string;
    address: string;
    city: string;
    district: string;
    emergencyContact?: string;
  };
  lastDonationDate?: Date;
  donationBadge: string;
  eligibleToDonate: boolean;
}

export interface UserSearchResponse {
  users: DonorSearchResult[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: UserSearchFilters;
}

export interface DonorDetailsResponse {
  user: DonorSearchResult;
  recentDonations: {
    id: string;
    date: Date;
    location: string;
    bloodGroup: string;
    status: string;
  }[];
  upcomingAppointments: {
    id: string;
    date: Date;
    location: string;
    status: string;
  }[];
  campaignParticipations: {
    id: string;
    campaignTitle: string;
    registrationDate: Date;
    status: string;
    attendanceMarked: boolean;
    donationCompleted: boolean;
  }[];
}

export interface VerifyDonorRequest {
  campaignId: string;
  verifiedBy: string;
  notes?: string;
}

export interface VerifyDonorResponse {
  verified: boolean;
  eligible: boolean;
  user: DonorSearchResult;
  eligibilityChecks: {
    ageRequirement: boolean;
    weightRequirement: boolean;
    healthStatus: boolean;
    lastDonationGap: boolean;
    activeAppointments: boolean;
  };
  restrictions?: string[];
  nextEligibleDate?: Date;
}

export interface RecentDonorsRequest {
  campaignId?: string;
  limit?: number;
  days?: number;
}

export interface FrequentDonorsRequest {
  limit?: number;
  minDonations?: number;
  timeframe?: string; // '3months', '6months', '1year'
}