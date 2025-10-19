import { prisma } from "../config/db.js";
import type { BloodDonation } from "@prisma/client";

export const DonorService = {
  getAllDonors: async (): Promise<BloodDonation[]> => {
    const donors = await prisma.bloodDonation.findMany({
      include: {
        user: true,
        bloodDonationForm: true,
        bloods: true,
      },
      orderBy: { startTime: "desc" },
    });

    return donors;
  },
  getDailyDonations: async (days = 30) => {
    // Return an array of { date: string, count: number } for the last `days` days
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));

    // Use Prisma groupBy to aggregate by date (startTime)
    const rows = await prisma.bloodDonation.groupBy({
      by: ["startTime" as any],
      where: {
        startTime: {
          gte: start,
        },
      },
      _count: {
        id: true,
      },
    });

    // Map and normalize to date-only keys
    const countsMap: Record<string, number> = {};
    rows.forEach((r) => {
      const dateStr = new Date(r.startTime as unknown as string).toISOString().slice(0, 10);
      countsMap[dateStr] = (r as any)._count?.id ?? 0;
    });

    // Build result for each day in range
    const result: { date: string; count: number }[] = [];
    for (let d = 0; d < days; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + d);
      const key = dt.toISOString().slice(0, 10);
      result.push({ date: key, count: countsMap[key] ?? 0 });
    }

    return result;
  },
};

export default DonorService;
