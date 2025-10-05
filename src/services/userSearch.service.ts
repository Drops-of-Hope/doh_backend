import { UserSearchRepository } from '../repositories/userSearch.repository.js';
import { UserSearchFilters, RecentDonorsRequest, FrequentDonorsRequest } from '../types/userSearch.types.js';

interface QueryFilters {
  q?: string;
  bloodGroup?: string;
  eligibleOnly?: string;
  minDonations?: string;
  page?: string;
  limit?: string;
  district?: string;
  city?: string;
  isActive?: string;
  campaignId?: string;
  days?: string;
  timeframe?: string;
}

export const UserSearchService = {
  // Search users with filters
  searchUsers: async (filters: QueryFilters) => {
    const parsedFilters: UserSearchFilters = {
      q: filters.q,
      bloodGroup: filters.bloodGroup,
      eligibleOnly: filters.eligibleOnly === 'true',
      minDonations: filters.minDonations ? parseInt(filters.minDonations) : undefined,
      page: filters.page ? parseInt(filters.page) : 1,
      limit: filters.limit ? parseInt(filters.limit) : 20,
      district: filters.district,
      city: filters.city,
      isActive: filters.isActive !== undefined ? filters.isActive === 'true' : undefined,
    };

    return await UserSearchRepository.searchUsers(parsedFilters);
  },

  // Get user profile with detailed information
  getUserProfile: async (userId: string) => {
    return await UserSearchRepository.getUserProfile(userId);
  },

  // Get recent donors
  getRecentDonors: async (filters: QueryFilters) => {
    const parsedFilters: RecentDonorsRequest = {
      campaignId: filters.campaignId,
      limit: filters.limit ? parseInt(filters.limit) : 10,
      days: filters.days ? parseInt(filters.days) : 30,
    };

    return await UserSearchRepository.getRecentDonors(parsedFilters);
  },

  // Get frequent donors
  getFrequentDonors: async (filters: QueryFilters) => {
    const parsedFilters: FrequentDonorsRequest = {
      limit: filters.limit ? parseInt(filters.limit) : 10,
      minDonations: filters.minDonations ? parseInt(filters.minDonations) : 3,
      timeframe: filters.timeframe || '1year',
    };

    return await UserSearchRepository.getFrequentDonors(parsedFilters);
  },

  // Check user eligibility
  checkUserEligibility: async (userId: string) => {
    return await UserSearchRepository.checkUserEligibility(userId);
  },

  // Verify donor for campaign
  verifyDonor: async (userId: string, campaignId?: string) => {
    const eligibility = await UserSearchRepository.checkUserEligibility(userId);
    
    if (!eligibility) {
      return { verified: false, reason: 'User not found' };
    }

    // Additional campaign-specific checks if campaignId is provided
    const additionalChecks: Record<string, boolean> = {};
    if (campaignId) {
      // Check if user is already registered for this campaign
      // This would require a separate repository method in production
      additionalChecks.notAlreadyRegistered = true;
    }

    return {
      verified: eligibility.eligible,
      eligibilityChecks: { ...eligibility.eligibilityChecks, ...additionalChecks },
      restrictions: eligibility.restrictions,
      nextEligibleDate: eligibility.nextEligibleDate,
      campaignId,
    };
  },

  // Search donors by blood group for emergency
  searchDonorsByBloodGroup: async (filters: QueryFilters) => {
    const searchFilters: UserSearchFilters = {
      bloodGroup: filters.bloodGroup,
      eligibleOnly: true,
      isActive: true,
      district: filters.district,
      city: filters.city,
      limit: filters.limit ? parseInt(filters.limit) : 50,
      page: 1,
    };

    return await UserSearchRepository.searchUsers(searchFilters);
  },
};