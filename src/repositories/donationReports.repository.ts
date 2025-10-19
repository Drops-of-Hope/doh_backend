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

  // Total number of users (donors) in the system
  async countTotalUsers(): Promise<number> {
    return prisma.user.count();
  },

  // Count distinct donors who donated in a given period
  async countDistinctDonorsInRange(start: Date, end: Date): Promise<number> {
    const groups = await prisma.bloodDonation.groupBy({
      by: ["userId"],
      where: {
        endTime: { gte: start, lt: end },
        userId: { not: null },
      },
      _count: { _all: true },
    });
    // Exclude any potential null userId just in case
    return groups.filter((g) => g.userId !== null).length;
  },

  // Count users who have NOT donated since the provided date (i.e., inactive since that date)
  async countInactiveDonorsSince(since: Date): Promise<number> {
    return prisma.user.count({
      where: {
        // none donations with endTime >= since means user didn't donate in that window
        bloodDonations: {
          none: {
            endTime: { gte: since },
          },
        },
      },
    });
  },

  // Total donations recorded that are associated with a user (exclude anonymous/null userId)
  async countTotalUserDonations(): Promise<number> {
    return prisma.bloodDonation.count({ where: { userId: { not: null } } });
  },

  // Fetch donors who haven't donated since a given date, with pagination
  async findInactiveDonorsSince(since: Date, skip = 0, take = 20) {
    return prisma.user.findMany({
      where: {
        bloodDonations: {
          none: {
            endTime: { gte: since },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        nic: true,
        bloodGroup: true,
        createdAt: true,
        updatedAt: true,
        totalDonations: true,
        userDetails: {
          select: {
            phoneNumber: true,
            city: true,
            district: true,
            address: true,
            type: true,
          },
        },
        // latest donation date if any (will be null for truly never-donated)
        bloodDonations: {
          orderBy: { endTime: "desc" },
          take: 1,
          select: { endTime: true },
        },
      },
    });
  },
};
