// Badge calculation and management utilities for donation system
import { DonationBadge } from "@prisma/client";

export class BadgeService {
  // Badge thresholds according to requirements
  private static readonly BADGE_THRESHOLDS = {
    BRONZE: 0,
    SILVER: 10,
    GOLD: 25,
    PLATINUM: 50,
    DIAMOND: 100,
  };

  /**
   * Calculate the appropriate badge based on total donations
   * @param totalDonations - Total number of donations by the user
   * @returns The appropriate DonationBadge enum value
   */
  static calculateBadge(totalDonations: number): DonationBadge {
    if (totalDonations >= this.BADGE_THRESHOLDS.DIAMOND) {
      return DonationBadge.DIAMOND;
    } else if (totalDonations >= this.BADGE_THRESHOLDS.PLATINUM) {
      return DonationBadge.PLATINUM;
    } else if (totalDonations >= this.BADGE_THRESHOLDS.GOLD) {
      return DonationBadge.GOLD;
    } else if (totalDonations >= this.BADGE_THRESHOLDS.SILVER) {
      return DonationBadge.SILVER;
    } else {
      return DonationBadge.BRONZE;
    }
  }

  /**
   * Get the next badge threshold
   * @param currentBadge - Current badge level
   * @returns Object with next badge and required donations
   */
  static getNextBadgeInfo(currentBadge: DonationBadge, currentDonations: number) {
    const thresholds = [
      { badge: DonationBadge.BRONZE, threshold: this.BADGE_THRESHOLDS.BRONZE },
      { badge: DonationBadge.SILVER, threshold: this.BADGE_THRESHOLDS.SILVER },
      { badge: DonationBadge.GOLD, threshold: this.BADGE_THRESHOLDS.GOLD },
      { badge: DonationBadge.PLATINUM, threshold: this.BADGE_THRESHOLDS.PLATINUM },
      { badge: DonationBadge.DIAMOND, threshold: this.BADGE_THRESHOLDS.DIAMOND },
    ];

    const currentIndex = thresholds.findIndex(t => t.badge === currentBadge);
    
    if (currentIndex === -1 || currentIndex === thresholds.length - 1) {
      return null; // Already at highest badge or invalid badge
    }

    const nextBadge = thresholds[currentIndex + 1];
    const donationsNeeded = nextBadge.threshold - currentDonations;

    return {
      nextBadge: nextBadge.badge,
      donationsNeeded: Math.max(0, donationsNeeded),
      threshold: nextBadge.threshold,
    };
  }

  /**
   * Check if a badge promotion occurred
   * @param oldBadge - Previous badge
   * @param newBadge - New badge
   * @returns true if promotion occurred
   */
  static isPromotion(oldBadge: DonationBadge, newBadge: DonationBadge): boolean {
    const badgeOrder = [
      DonationBadge.BRONZE,
      DonationBadge.SILVER, 
      DonationBadge.GOLD,
      DonationBadge.PLATINUM,
      DonationBadge.DIAMOND,
    ];

    const oldIndex = badgeOrder.indexOf(oldBadge);
    const newIndex = badgeOrder.indexOf(newBadge);

    return newIndex > oldIndex;
  }

  /**
   * Get badge display information
   * @param badge - DonationBadge enum value
   * @returns Display information for the badge
   */
  static getBadgeDisplayInfo(badge: DonationBadge) {
    switch (badge) {
      case DonationBadge.DIAMOND:
        return {
          name: "DIAMOND",
          color: "#B23CFD",
          icon: "diamond",
          gradient: ["#B23CFD", "#9333EA"],
          description: "Ultimate donor - 100+ donations",
        };
      case DonationBadge.PLATINUM:
        return {
          name: "PLATINUM", 
          color: "#E5E7EB",
          icon: "trophy",
          gradient: ["#E5E7EB", "#9CA3AF"],
          description: "Elite donor - 50+ donations",
        };
      case DonationBadge.GOLD:
        return {
          name: "GOLD",
          color: "#F59E0B",
          icon: "medal",
          gradient: ["#F59E0B", "#D97706"],
          description: "Champion donor - 25+ donations",
        };
      case DonationBadge.SILVER:
        return {
          name: "SILVER",
          color: "#9CA3AF",
          icon: "ribbon",
          gradient: ["#9CA3AF", "#6B7280"],
          description: "Dedicated donor - 10+ donations",
        };
      case DonationBadge.BRONZE:
      default:
        return {
          name: "BRONZE",
          color: "#92400E",
          icon: "star",
          gradient: ["#92400E", "#78350F"],
          description: "Welcome donor - getting started",
        };
    }
  }

  /**
   * Get all badge thresholds for display
   * @returns Array of badge information with thresholds
   */
  static getAllBadgeThresholds() {
    return [
      { badge: DonationBadge.BRONZE, threshold: this.BADGE_THRESHOLDS.BRONZE, ...this.getBadgeDisplayInfo(DonationBadge.BRONZE) },
      { badge: DonationBadge.SILVER, threshold: this.BADGE_THRESHOLDS.SILVER, ...this.getBadgeDisplayInfo(DonationBadge.SILVER) },
      { badge: DonationBadge.GOLD, threshold: this.BADGE_THRESHOLDS.GOLD, ...this.getBadgeDisplayInfo(DonationBadge.GOLD) },
      { badge: DonationBadge.PLATINUM, threshold: this.BADGE_THRESHOLDS.PLATINUM, ...this.getBadgeDisplayInfo(DonationBadge.PLATINUM) },
      { badge: DonationBadge.DIAMOND, threshold: this.BADGE_THRESHOLDS.DIAMOND, ...this.getBadgeDisplayInfo(DonationBadge.DIAMOND) },
    ];
  }
}

export default BadgeService;