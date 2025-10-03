import { Request, Response } from 'express';
import { UserSearchService } from '../services/userSearch.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export const UserSearchController = {
  // Search users with filters
  searchUsers: async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query;
      const result = await UserSearchService.searchUsers(filters);
      res.json(result);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user profile with detailed information
  getUserProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const profile = await UserSearchService.getUserProfile(userId);
      
      if (!profile) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get detailed information about a specific donor (alias for getUserProfile)
  getDonorDetails: async (req: Request, res: Response): Promise<void> => {
    try {
      const { donorId } = req.params;
      const profile = await UserSearchService.getUserProfile(donorId);
      
      if (!profile) {
        res.status(404).json({ error: 'Donor not found' });
        return;
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error getting donor details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get recent donors
  getRecentDonors: async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query;
      const donors = await UserSearchService.getRecentDonors(filters);
      res.json(donors);
    } catch (error) {
      console.error('Error getting recent donors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get frequent donors
  getFrequentDonors: async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query;
      const donors = await UserSearchService.getFrequentDonors(filters);
      res.json(donors);
    } catch (error) {
      console.error('Error getting frequent donors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Check user eligibility
  checkUserEligibility: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const eligibility = await UserSearchService.checkUserEligibility(userId);
      
      if (!eligibility) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.json(eligibility);
    } catch (error) {
      console.error('Error checking user eligibility:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Verify donor for campaign
  verifyDonor: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { campaignId } = req.body;
      
      const verification = await UserSearchService.verifyDonor(userId, campaignId);
      res.json(verification);
    } catch (error) {
      console.error('Error verifying donor:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Search donors by blood group for emergency
  searchDonorsByBloodGroup: async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query;
      const donors = await UserSearchService.searchDonorsByBloodGroup(filters);
      res.json(donors);
    } catch (error) {
      console.error('Error searching donors by blood group:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};