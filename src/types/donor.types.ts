import { District } from "@prisma/client";

export interface DonorCountByDistrict {
  district: District;
  donorCount: number;
}

export interface DonorCountResponse {
  success: boolean;
  data: DonorCountByDistrict[];
  message: string;
}

// Summary counts for donors/appointments/donations
export interface DonorSummaryCounts {
  totalDonors: number;
  appointmentsToday: number;
  donationsThisMonth: number;
}

export interface DonorSummaryResponse {
  success: boolean;
  data: DonorSummaryCounts;
  message: string;
}
