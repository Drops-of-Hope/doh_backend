import { prisma } from "../config/db.js";
import {
  DonorCountByDistrict,
  DonorSummaryCounts,
} from "../types/donor.types.js";

export const DonorRepository = {
  // Get donor counts grouped by district
  getDonorCountsByDistrict: async (): Promise<DonorCountByDistrict[]> => {
    const districtCounts = await prisma.userDetail.groupBy({
      by: ["district"],
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: "desc",
        },
      },
    });

    return districtCounts.map((item) => ({
      district: item.district,
      donorCount: item._count.userId,
    }));
  },
  // Get overall counts: total donors (User), today's appointments, this month's donations
  getSummaryCounts: async (): Promise<DonorSummaryCounts> => {
    const now = new Date();
    // Today range
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    // Current month range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalDonors, appointmentsToday, donationsThisMonth] =
      await Promise.all([
        prisma.user.count(),
        prisma.appointment.count({
          where: {
            appointmentDate: {
              gte: startOfToday,
              lt: endOfToday,
            },
          },
        }),
        prisma.bloodDonation.count({
          where: {
            startTime: {
              gte: startOfMonth,
              lt: startOfNextMonth,
            },
          },
        }),
      ]);

    return { totalDonors, appointmentsToday, donationsThisMonth };
  },
};
