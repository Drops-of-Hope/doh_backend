import { BloodGroup, Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";

export type BloodBankHomeCounts = {
  totalBloodUnits: number;
  expiringSoonUnits: number;
  transitRecords: number;
};

export const BloodBankHomeService = {
  // Returns overall counts for the blood bank home dashboard
  async getCounts(): Promise<BloodBankHomeCounts> {
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const [totalBloodUnits, expiringSoonUnits, transitRecords] =
      await Promise.all([
        // Total blood units that are not consumed and not disposed
        prisma.blood.count({
          where: {
            consumed: false,
            disposed: false,
          },
        }),

        // Blood units expiring within a week (not already expired)
        prisma.blood.count({
          where: {
            consumed: false,
            disposed: false,
            expiryDate: {
              gt: now,
              lte: weekAhead,
            },
          },
        }),

        // Total records in the blood transit table
        prisma.bloodTransit.count(),
      ]);

    return { totalBloodUnits, expiringSoonUnits, transitRecords };
  },
  // Returns counts of available blood units by donor blood group for pie charts
  async getBloodTypeDistribution(): Promise<{
    data: Array<{ blood_group: BloodGroup; count: number }>;
    total: number;
  }> {
    // Consider units that are not consumed or disposed
    const where = {
      consumed: false,
      disposed: false,
    } satisfies Prisma.BloodWhereInput;

    const records = await prisma.blood.findMany({
      where,
      include: {
        bloodDonation: {
          include: {
            user: true,
          },
        },
      },
    });

    type BloodRecord = Prisma.BloodGetPayload<{
      include: { bloodDonation: { include: { user: true } } };
    }>;

    function getGroup(r: BloodRecord): BloodGroup | null {
      const g = r.bloodDonation?.user?.bloodGroup as BloodGroup | undefined;
      return g ?? null;
    }

    const counts = new Map<BloodGroup, number>();
    let total = 0;
    for (const r of records) {
      const g = getGroup(r);
      if (!g) continue; // skip if no user or blood group present
      counts.set(g, (counts.get(g) ?? 0) + 1);
      total += 1;
    }

    // Sort in typical ABO order for consistent charts
    const order: BloodGroup[] = [
      BloodGroup.O_NEGATIVE,
      BloodGroup.O_POSITIVE,
      BloodGroup.A_NEGATIVE,
      BloodGroup.A_POSITIVE,
      BloodGroup.B_NEGATIVE,
      BloodGroup.B_POSITIVE,
      BloodGroup.AB_NEGATIVE,
      BloodGroup.AB_POSITIVE,
    ];

    const data = Array.from(counts.entries())
      .map(([blood_group, count]) => ({ blood_group, count }))
      .sort(
        (a, b) => order.indexOf(a.blood_group) - order.indexOf(b.blood_group)
      );

    return { data, total };
  },
  // Returns two-week donation overview and comparisons using donor blood groups
  async getTwoWeekDonationsStats(): Promise<{
    thisWeekCount: number;
    lastWeekCount: number;
    difference: number;
    percentChange: number | null; // null when lastWeekCount is 0 to avoid division-by-zero
    byBloodGroup: Array<{ blood_group: BloodGroup; count: number }>; // for this week
    mostDonatedThisWeek: { blood_group: BloodGroup; count: number } | null;
    leastDonatedThisWeek: { blood_group: BloodGroup; count: number } | null;
    ranges: { thisWeekStart: Date; lastWeekStart: Date; now: Date };
  }> {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);

    const donations = await prisma.bloodDonation.findMany({
      where: {
        startTime: { gte: lastWeekStart },
      },
      include: {
        user: true,
      },
    });

    // Partition into last week and this week
    const lastWeek = donations.filter(
      (d) => d.startTime >= lastWeekStart && d.startTime < thisWeekStart
    );
    const thisWeek = donations.filter((d) => d.startTime >= thisWeekStart);

    const lastWeekCount = lastWeek.length;
    const thisWeekCount = thisWeek.length;
    const difference = thisWeekCount - lastWeekCount;
    const percentChange: number | null =
      lastWeekCount > 0 ? (difference / lastWeekCount) * 100 : null;
    // For charts, compute this week's donations grouped by user.bloodGroup
    const counts = new Map<BloodGroup, number>();
    for (const d of thisWeek) {
      const g = d.user?.bloodGroup as BloodGroup | undefined;
      if (!g) continue;
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }

    // Determine most/least donated blood types this week
    let most: { blood_group: BloodGroup; count: number } | null = null;
    let least: { blood_group: BloodGroup; count: number } | null = null;
    for (const [blood_group, count] of counts.entries()) {
      if (!most || count > most.count) most = { blood_group, count };
      if (!least || count < least.count) least = { blood_group, count };
    }

    // Order for consistent UI display
    const order: BloodGroup[] = [
      BloodGroup.O_NEGATIVE,
      BloodGroup.O_POSITIVE,
      BloodGroup.A_NEGATIVE,
      BloodGroup.A_POSITIVE,
      BloodGroup.B_NEGATIVE,
      BloodGroup.B_POSITIVE,
      BloodGroup.AB_NEGATIVE,
      BloodGroup.AB_POSITIVE,
    ];

    const byBloodGroup = Array.from(counts.entries())
      .map(([blood_group, count]) => ({ blood_group, count }))
      .sort(
        (a, b) => order.indexOf(a.blood_group) - order.indexOf(b.blood_group)
      );

    return {
      thisWeekCount,
      lastWeekCount,
      difference,
      percentChange,
      byBloodGroup,
      mostDonatedThisWeek: most,
      leastDonatedThisWeek: least,
      ranges: { thisWeekStart, lastWeekStart, now },
    };
  },
};

export default BloodBankHomeService;
