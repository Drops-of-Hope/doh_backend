import { District } from '@prisma/client';

export interface DonorCountByDistrict {
  district: District;
  donorCount: number;
}

export interface DonorCountResponse {
  success: boolean;
  data: DonorCountByDistrict[];
  message: string;
}
