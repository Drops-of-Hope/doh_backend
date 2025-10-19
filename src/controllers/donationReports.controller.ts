import { Request, Response } from "express";
import { DonationReportsRepository } from "../repositories/donationReports.repository.js";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

export const DonationReportsController = {
  // GET /donation-reports/stats
  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now); // exclusive

      const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const lastMonthStart = startOfMonth(lastMonthRef);
      const lastMonthEnd = endOfMonth(lastMonthRef);

      // Last 30 days window
      const last30End = now;
      const last30Start = new Date(now);
      last30Start.setDate(now.getDate() - 30);

      const [thisMonthCount, lastMonthCount, countLast30, bloodGroupCounts30] =
        await Promise.all([
          DonationReportsRepository.countDonationsInRange(
            thisMonthStart,
            thisMonthEnd
          ),
          DonationReportsRepository.countDonationsInRange(
            lastMonthStart,
            lastMonthEnd
          ),
          DonationReportsRepository.countDonationsInRange(
            last30Start,
            last30End
          ),
          DonationReportsRepository.getBloodGroupCountsInRange(
            last30Start,
            last30End
          ),
        ]);

      const delta = thisMonthCount - lastMonthCount;
      const last30DaysAvg = parseFloat((countLast30 / 30).toFixed(2));

      // For monthly average comparison, compute last month average per day based on its length
      const daysInLastMonth = Math.round(
        (lastMonthEnd.getTime() - lastMonthStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const lastMonthAvgPerDay =
        daysInLastMonth > 0 ? lastMonthCount / daysInLastMonth : 0;
      const increasedAvg = last30DaysAvg > lastMonthAvgPerDay;
      const monthOverMonth =
        delta > 0 ? "increased" : delta < 0 ? "decreased" : "same";

      // Determine most and least donated blood types over last 30 days
      const sorted = [...bloodGroupCounts30].sort((a, b) => b.count - a.count);
      const mostDonated = sorted[0] || null;
      const leastDonated = sorted.length ? sorted[sorted.length - 1] : null;

      res.status(200).json({
        success: true,
        data: {
          thisMonth: thisMonthCount,
          lastMonth: lastMonthCount,
          diffFromLastMonth: delta,
          monthOverMonth,
          last30DaysAvgPerDay: last30DaysAvg,
          avgComparedToLastMonth: increasedAvg
            ? "increased"
            : last30DaysAvg < lastMonthAvgPerDay
            ? "decreased"
            : "same",
          mostDonatedBloodType: mostDonated
            ? { type: mostDonated.bloodGroup, count: mostDonated.count }
            : null,
          leastDonatedBloodType: leastDonated
            ? { type: leastDonated.bloodGroup, count: leastDonated.count }
            : null,
        },
      });
    } catch (error) {
      console.error("Error generating donation stats:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to generate donation stats" });
    }
  },

  // GET /donation-reports/donors/stats
  async getDonorStats(_req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      // This month range
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      // One year inactivity threshold
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const [
        totalDonors,
        activeThisMonthDonors,
        inactiveDonors,
        totalUserDonations,
      ] = await Promise.all([
        DonationReportsRepository.countTotalUsers(),
        DonationReportsRepository.countDistinctDonorsInRange(
          monthStart,
          monthEnd
        ),
        DonationReportsRepository.countInactiveDonorsSince(oneYearAgo),
        DonationReportsRepository.countTotalUserDonations(),
      ]);

      const activePercent = totalDonors
        ? parseFloat(((activeThisMonthDonors / totalDonors) * 100).toFixed(2))
        : 0;
      const inactivePercent = totalDonors
        ? parseFloat(((inactiveDonors / totalDonors) * 100).toFixed(2))
        : 0;
      const avgDonationsPerDonor = totalDonors
        ? parseFloat((totalUserDonations / totalDonors).toFixed(2))
        : 0;

      res.status(200).json({
        success: true,
        data: {
          totalDonors,
          activeDonorsThisMonth: activeThisMonthDonors,
          activeDonorsPercent: activePercent,
          inactiveDonorsLastYear: inactiveDonors,
          inactiveDonorsPercent: inactivePercent,
          avgDonationsPerDonor,
        },
      });
    } catch (error) {
      console.error("Error generating donor stats:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to generate donor stats" });
    }
  },

  // GET /donation-reports/donors/inactive
  async getInactiveDonors(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const page = Math.max(
        parseInt(String(req.query.page ?? "1"), 10) || 1,
        1
      );
      const limit = Math.min(
        Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1),
        100
      );
      const skip = (page - 1) * limit;

      const [items, totalInactive] = await Promise.all([
        DonationReportsRepository.findInactiveDonorsSince(
          oneYearAgo,
          skip,
          limit
        ),
        DonationReportsRepository.countInactiveDonorsSince(oneYearAgo),
      ]);

      const donors = items.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        nic: u.nic,
        bloodGroup: u.bloodGroup,
        totalDonations: u.totalDonations,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastDonationDate: u.bloodDonations?.[0]?.endTime ?? null,
        userDetails: u.userDetails ?? null,
      }));

      res.status(200).json({
        success: true,
        data: {
          donors,
          pagination: {
            page,
            limit,
            total: totalInactive,
            totalPages: Math.ceil(totalInactive / limit) || 1,
            hasNext: skip + donors.length < totalInactive,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching inactive donors:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch inactive donors" });
    }
  },
};
