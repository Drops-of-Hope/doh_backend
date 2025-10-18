import { prisma } from '../config/db.js';
import { DonorCountByDistrict } from '../types/donor.types.js';

export const DonorRepository = {
  // Get donor counts grouped by district
  getDonorCountsByDistrict: async (): Promise<DonorCountByDistrict[]> => {
    const districtCounts = await prisma.userDetail.groupBy({
      by: ['district'],
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
    });

    return districtCounts.map((item) => ({
      district: item.district,
      donorCount: item._count.userId,
    }));
  },
};
