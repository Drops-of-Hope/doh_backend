import { EligibilityRepository } from '../repositories/eligibility.repository.js';

export const EligibilityService = {
  updateNextEligible: EligibilityRepository.update,
};
