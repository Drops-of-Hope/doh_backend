import { Request, Response } from 'express';
import { EligibilityService } from '../services/eligibility.service';

export const EligibilityController = {

  // Update nextEligible date for a user
  update: async (req: Request, res: Response) => {
    const id = req.params.id;
    const { nextEligible } = req.body;

    const updated = await EligibilityService.updateNextEligible({ userId: id, nextEligible });

    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: 'User not found or update failed' });
    }
  },
};
