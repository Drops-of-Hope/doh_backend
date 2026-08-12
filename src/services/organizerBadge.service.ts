// Organizer badge calculation, based on number of completed campaigns organized
import { prisma } from "../config/db.js";

export type OrganizerBadgeTier = "NONE" | "HOST" | "SILVER_HOST" | "GOLD_HOST" | "PLATINUM_HOST" | "DIAMOND_HOST";

export class OrganizerBadgeService {
  // Tier thresholds, keyed by number of completed campaigns organized
  private static readonly TIER_THRESHOLDS: { tier: OrganizerBadgeTier; threshold: number }[] = [
    { tier: "DIAMOND_HOST", threshold: 50 },
    { tier: "PLATINUM_HOST", threshold: 25 },
    { tier: "GOLD_HOST", threshold: 10 },
    { tier: "SILVER_HOST", threshold: 5 },
    { tier: "HOST", threshold: 1 },
    { tier: "NONE", threshold: 0 },
  ];

  /**
   * Count campaigns a user has organized that have actually completed:
   * approved by an admin and past their end time.
   */
  static async countCompletedCampaigns(organizerId: string): Promise<number> {
    return prisma.campaign.count({
      where: {
        organizerId,
        isApproved: "ACCEPTED",
        endTime: { lt: new Date() },
      },
    });
  }

  static calculateTier(completedCampaigns: number): OrganizerBadgeTier {
    const match = this.TIER_THRESHOLDS.find((t) => completedCampaigns >= t.threshold);
    return match ? match.tier : "NONE";
  }

  static getNextTierInfo(currentTier: OrganizerBadgeTier, completedCampaigns: number) {
    const ordered = [...this.TIER_THRESHOLDS].reverse(); // NONE -> DIAMOND_HOST
    const currentIndex = ordered.findIndex((t) => t.tier === currentTier);

    if (currentIndex === -1 || currentIndex === ordered.length - 1) {
      return null;
    }

    const next = ordered[currentIndex + 1];
    return {
      nextTier: next.tier,
      campaignsNeeded: Math.max(0, next.threshold - completedCampaigns),
      threshold: next.threshold,
    };
  }

  static getTierDisplayInfo(tier: OrganizerBadgeTier) {
    switch (tier) {
      case "DIAMOND_HOST":
        return {
          name: "DIAMOND HOST",
          color: "#B23CFD",
          icon: "diamond",
          gradient: ["#B23CFD", "#9333EA"],
          description: "Legendary organizer - 50+ completed campaigns",
        };
      case "PLATINUM_HOST":
        return {
          name: "PLATINUM HOST",
          color: "#E5E7EB",
          icon: "trophy",
          gradient: ["#E5E7EB", "#9CA3AF"],
          description: "Elite organizer - 25+ completed campaigns",
        };
      case "GOLD_HOST":
        return {
          name: "GOLD HOST",
          color: "#F59E0B",
          icon: "medal",
          gradient: ["#F59E0B", "#D97706"],
          description: "Champion organizer - 10+ completed campaigns",
        };
      case "SILVER_HOST":
        return {
          name: "SILVER HOST",
          color: "#9CA3AF",
          icon: "ribbon",
          gradient: ["#9CA3AF", "#6B7280"],
          description: "Dedicated organizer - 5+ completed campaigns",
        };
      case "HOST":
        return {
          name: "HOST",
          color: "#0EA5E9",
          icon: "flag",
          gradient: ["#0EA5E9", "#0284C7"],
          description: "First campaign organized",
        };
      case "NONE":
      default:
        return {
          name: "NONE",
          color: "#9CA3AF",
          icon: "flag-outline",
          gradient: ["#D1D5DB", "#9CA3AF"],
          description: "No completed campaigns yet",
        };
    }
  }

  static getAllTierThresholds() {
    return [...this.TIER_THRESHOLDS]
      .reverse()
      .map(({ tier, threshold }) => ({ tier, threshold, ...this.getTierDisplayInfo(tier) }));
  }
}

export default OrganizerBadgeService;
