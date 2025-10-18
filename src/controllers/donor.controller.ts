import { Request, Response } from 'express';
import { DonorService } from '../services/donor.service.js';

export const DonorController = {
  // GET /api/donors/location-count - Get donor counts grouped by district
  getDonorCountsByDistrict: async (req: Request, res: Response): Promise<void> => {
    try {
      const donorCounts = await DonorService.getDonorCountsByDistrict();

      // Check if any donors found
      if (!donorCounts || donorCounts.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No donors found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: donorCounts,
        message: 'Donor counts by district retrieved successfully',
      });
    } catch (error: unknown) {
      console.error('Error retrieving donor counts by district:', error);

      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: message,
      });
    }
  },
};
