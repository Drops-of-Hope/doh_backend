import { EligibilityRepository } from '../repositories/eligibility.repository';

export const EligibilityService = {
  updateNextEligible: EligibilityRepository.update,
};
