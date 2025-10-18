import { DonorRepository } from '../repositories/donor.repository.js';

export const DonorService = {
  getDonorCountsByDistrict: DonorRepository.getDonorCountsByDistrict,
};
