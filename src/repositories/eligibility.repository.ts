import { prisma } from '../config/db.js';
import { UpdateEligibilityInput } from '../types/index.js';

export const EligibilityRepository = {
  // Update nextEligible of a user
  update: ({ userId, nextEligible }: UpdateEligibilityInput) =>
    prisma.user.update({
      where: { id: userId.trim() },
      data: { nextEligible: new Date(nextEligible) },
    }),
    
};
