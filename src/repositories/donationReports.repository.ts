import { prisma } from "../config/db.js";

export type BloodGroupCount = {
  bloodGroup: string;
  count: number;
};

export const DonationReportsRepository = {
  // Count donations in a given date range (inclusive start, exclusive end)
  async countDonationsInRange(start: Date, end: Date): Promise<number> {
    const count = await prisma.bloodDonation.count({
      where: {
        endTime: {
          gte: start,
          lt: end,
        },
      },
    });
    return count;
  },

  // Get blood group counts for donations in a given range by joining through user bloodGroup
  async getBloodGroupCountsInRange(
    start: Date,
    end: Date
  ): Promise<BloodGroupCount[]> {
    // We count donations grouped by the donor's blood group. Some donations may not have userId
    // We exclude null userId as blood group would be unknown.
    const groups = await prisma.bloodDonation.groupBy({
      by: ["userId"],
      where: {
        endTime: {
          gte: start,
          lt: end,
        },
        userId: { not: null },
      },
      _count: { _all: true },
    });

    if (groups.length === 0) return [];

    // Fetch users for these userIds to get bloodGroup and map to counts
    const userIds = groups.map((g) => g.userId!) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, bloodGroup: true },
    });
    const bloodGroupByUser = new Map(users.map((u) => [u.id, u.bloodGroup]));

    const counts = new Map<string, number>();
    for (const g of groups) {
      const bg = bloodGroupByUser.get(g.userId!);
      if (!bg) continue;
      counts.set(bg, (counts.get(bg) || 0) + (g._count?._all || 0));
    }

    return Array.from(counts.entries()).map(([bloodGroup, count]) => ({
      bloodGroup,
      count,
    }));
  },
};
