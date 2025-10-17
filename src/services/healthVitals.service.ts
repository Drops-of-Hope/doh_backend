import { HealthVitalsRepository } from '../repositories/healthVitals.repository.js';

export const HealthVitalsService = {
  create: HealthVitalsRepository.create,
};