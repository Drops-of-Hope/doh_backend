import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    bloodGroup?: string;
    nic?: string;
  };
}

export const HomeController = {
  // GET /home/dashboard
  getDashboard: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access dashboard",
        });
        return;
      }

      // Get user stats (aggregated table)
      const userStats = await prisma.userHomeStats.findUnique({
        where: { userId },
      });

      // Also fetch the user's totals and nextEligible to compute current eligibility
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { nextEligible: true, totalDonations: true, totalPoints: true },
      });

      // Get today's appointment (if any) - only 1 per user per day
      const today = new Date();
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrowDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todaysAppointment = await prisma.appointment.findFirst({
        where: {
          donorId: userId,
          appointmentDate: {
            gte: todayDateOnly,
            lt: tomorrowDateOnly,
          },
          scheduled: {
            not: "CANCELLED",
          },
        },
        include: {
          medicalEstablishment: {
            select: {
              id: true,
              name: true,
              address: true,
              region: true,
            },
          },
          slot: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      // Get upcoming appointments (excluding today's)
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          donorId: userId,
          appointmentDate: {
            gte: tomorrowDateOnly,
          },
          scheduled: "PENDING",
        },
        include: {
          medicalEstablishment: true,
          slot: true,
        },
        orderBy: {
          appointmentDate: "asc",
        },
        take: 5,
      });

      // Get recent activities
      const recentActivities = await prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Get active emergencies
      const emergencies = await prisma.emergencyRequest.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: {
            gte: new Date(),
          },
        },
        include: {
          hospital: {
            include: {
              medicalEstablishment: true,
            },
          },
        },
        orderBy: { urgencyLevel: "asc" },
        take: 5,
      });

      // Get featured campaigns
      const featuredCampaigns = await prisma.campaign.findMany({
        where: {
          isActive: true,
          startTime: {
            gte: new Date(),
          },
        },
        include: {
          medicalEstablishment: true,
          organizer: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      });

      // Get notifications
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      const eligibleToDonateComputed = user?.nextEligible
        ? user.nextEligible <= new Date()
        : true;
      const nextEligibleDateComputed =
        user?.nextEligible ?? userStats?.nextEligibleDate ?? null;

      res.status(200).json({
        data: {
          userStats: userStats
            ? {
                ...userStats,
                // Ensure totals and next donation date are sourced from User table
                totalDonations:
                  user?.totalDonations ?? userStats.totalDonations,
                totalPoints: user?.totalPoints ?? userStats.totalPoints,
                eligibleToDonate: eligibleToDonateComputed,
                nextEligibleDate: nextEligibleDateComputed,
              }
            : {
                totalDonations: user?.totalDonations ?? 0,
                totalPoints: user?.totalPoints ?? 0,
                donationStreak: 0,
                lastDonationDate: null,
                eligibleToDonate: eligibleToDonateComputed,
                nextEligibleDate: nextEligibleDateComputed,
                nextAppointmentDate:
                  todaysAppointment?.appointmentDate || upcomingAppointments[0]?.appointmentDate || null,
                nextAppointmentId: todaysAppointment?.id || upcomingAppointments[0]?.id || null,
              },
          todaysAppointment: todaysAppointment
            ? {
                id: todaysAppointment.id,
                appointmentDateTime: todaysAppointment.appointmentDate.toISOString(),
                scheduled: todaysAppointment.scheduled,
                medicalEstablishment: {
                  id: todaysAppointment.medicalEstablishment.id,
                  name: todaysAppointment.medicalEstablishment.name,
                  address: todaysAppointment.medicalEstablishment.address,
                  district: todaysAppointment.medicalEstablishment.region,
                },
                slot: {
                  id: todaysAppointment.slot?.id || null,
                  startTime: todaysAppointment.slot?.startTime || "09:00",
                  endTime: todaysAppointment.slot?.endTime || "17:00",
                },
                location: todaysAppointment.medicalEstablishment.address,
              }
            : null,
          upcomingAppointments: upcomingAppointments.map((apt) => ({
            id: apt.id,
            donorId: apt.donorId,
            appointmentDateTime: apt.appointmentDate,
            scheduled: apt.scheduled,
            location: apt.medicalEstablishment.address,
            notes: null,
            createdAt: apt.appointmentDate,
            medicalEstablishment: {
              id: apt.medicalEstablishment.id,
              name: apt.medicalEstablishment.name,
              address: apt.medicalEstablishment.address,
              district: apt.medicalEstablishment.region,
            },
          })),
          recentActivities,
          emergencies: emergencies.map((emergency) => ({
            id: emergency.id,
            title: emergency.title,
            description: emergency.description,
            bloodTypesNeeded: emergency.bloodTypesNeeded,
            urgencyLevel: emergency.urgencyLevel,
            status: emergency.status,
            expiresAt: emergency.expiresAt,
            contactNumber: emergency.contactNumber,
            hospital: {
              id: emergency.hospital.id,
              name: emergency.hospital.name,
              address: emergency.hospital.address,
              district: emergency.hospital.district,
            },
          })),
          featuredCampaigns: featuredCampaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            type: campaign.type,
            location: campaign.location,
            description: campaign.description,
            startTime: campaign.startTime,
            endTime: campaign.endTime,
            expectedDonors: campaign.expectedDonors,
            actualDonors: campaign.actualDonors,
            imageUrl: campaign.imageUrl,
            organizer: campaign.organizer.name,
            medicalEstablishment: campaign.medicalEstablishment,
          })),
          notifications,
        },
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch dashboard data",
      });
    }
  },

  // GET /home/stats
  getStats: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access stats",
        });
        return;
      }

      // Get or create user home stats
      let userStats = await prisma.userHomeStats.findUnique({
        where: { userId },
      });

      if (!userStats) {
        // Create initial stats record
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        userStats = await prisma.userHomeStats.create({
          data: {
            userId,
            totalDonations: user?.totalDonations || 0,
            totalPoints: user?.totalPoints || 0,
          },
        });
      }

      // Also fetch the user's totals and nextEligible to compute eligibility
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { nextEligible: true, totalDonations: true, totalPoints: true },
      });

      // Get next appointment
      const nextAppointment = await prisma.appointment.findFirst({
        where: {
          donorId: userId,
          appointmentDate: {
            gte: new Date(),
          },
          scheduled: "PENDING",
        },
        orderBy: {
          appointmentDate: "asc",
        },
      });

      const eligibleToDonateComputed = user?.nextEligible
        ? user.nextEligible <= new Date()
        : true;
      const nextEligibleDateComputed =
        user?.nextEligible ?? userStats.nextEligibleDate ?? null;

      res.status(200).json({
        data: {
          totalDonations: user?.totalDonations ?? userStats.totalDonations,
          totalPoints: user?.totalPoints ?? userStats.totalPoints,
          donationStreak: userStats.donationStreak,
          lastDonationDate: userStats.lastDonationDate,
          eligibleToDonate: eligibleToDonateComputed,
          nextEligibleDate: nextEligibleDateComputed,
          nextAppointmentDate: nextAppointment?.appointmentDate || null,
          nextAppointmentId: nextAppointment?.id || null,
        },
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch user statistics",
      });
    }
  },

  // GET /home/data - Mobile app home screen data
  getHomeData: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to access home data",
        });
        return;
      }

      // Get user stats
      const userStats = await prisma.userHomeStats.findUnique({
        where: { userId },
      });

      // Also fetch the user's totals and nextEligible to compute current eligibility
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { nextEligible: true, totalDonations: true, totalPoints: true },
      });

      // Get today's appointment (if any) - only 1 per user per day
      // Use SQL date comparison to avoid timezone issues
      const today = new Date();
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrowDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todaysAppointment = await prisma.appointment.findFirst({
        where: {
          donorId: userId,
          appointmentDate: {
            gte: todayDateOnly,
            lt: tomorrowDateOnly,
          },
          scheduled: {
            not: "CANCELLED",
          },
        },
        include: {
          medicalEstablishment: {
            select: {
              id: true,
              name: true,
              address: true,
              region: true,
            },
          },
          slot: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      // Get upcoming appointments (excluding today's)
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          donorId: userId,
          appointmentDate: {
            gte: tomorrowDateOnly,
          },
        },
        include: {
          medicalEstablishment: {
            select: {
              id: true,
              name: true,
              address: true,
              region: true,
            },
          },
          slot: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: {
          appointmentDate: "asc",
        },
        take: 5,
      });

      // Get featured campaigns (upcoming)
      const featuredCampaigns = await prisma.campaign.findMany({
        where: {
          isActive: true,
          startTime: {
            gte: new Date(),
          },
        },
        include: {
          medicalEstablishment: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          organizer: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              participations: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
        take: 10,
      });

      // Get active emergencies
      const emergencies = await prisma.emergencyRequest.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: {
            gte: new Date(),
          },
        },
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              district: true,
            },
          },
        },
        orderBy: { urgencyLevel: "asc" },
        take: 5,
      });

      const eligibleToDonateComputed = user?.nextEligible
        ? user.nextEligible <= new Date()
        : true;
      const nextEligibleDateComputed =
        user?.nextEligible ?? userStats?.nextEligibleDate ?? null;

      res.status(200).json({
        data: {
          userStats: userStats
            ? {
                ...userStats,
                totalDonations:
                  user?.totalDonations ?? userStats.totalDonations,
                totalPoints: user?.totalPoints ?? userStats.totalPoints,
                eligibleToDonate: eligibleToDonateComputed,
                nextEligibleDate: nextEligibleDateComputed,
              }
            : {
                id: userId,
                userId,
                totalDonations: user?.totalDonations ?? 0,
                totalPoints: user?.totalPoints ?? 0,
                donationStreak: 0,
                lastDonationDate: null,
                eligibleToDonate: eligibleToDonateComputed,
                nextEligibleDate: nextEligibleDateComputed,
                nextAppointmentDate:
                  upcomingAppointments[0]?.appointmentDate || null,
                nextAppointmentId: upcomingAppointments[0]?.id || null,
                lastUpdated: new Date().toISOString(),
              },
          todaysAppointment: todaysAppointment
            ? {
                id: todaysAppointment.id,
                appointmentDateTime: todaysAppointment.appointmentDate.toISOString(),
                scheduled: todaysAppointment.scheduled,
                medicalEstablishment: {
                  id: todaysAppointment.medicalEstablishment.id,
                  name: todaysAppointment.medicalEstablishment.name,
                  address: todaysAppointment.medicalEstablishment.address,
                  district: todaysAppointment.medicalEstablishment.region,
                },
                slot: {
                  id: todaysAppointment.slot?.id || null,
                  startTime: todaysAppointment.slot?.startTime || "09:00",
                  endTime: todaysAppointment.slot?.endTime || "17:00",
                },
                location: todaysAppointment.medicalEstablishment.address,
              }
            : null,
          upcomingAppointments: upcomingAppointments.map((apt) => ({
            id: apt.id,
            donorId: apt.donorId,
            appointmentDateTime: apt.appointmentDate.toISOString(),
            scheduled: apt.scheduled,
            location: apt.medicalEstablishment.address,
            medicalEstablishment: {
              id: apt.medicalEstablishment.id,
              name: apt.medicalEstablishment.name,
              address: apt.medicalEstablishment.address,
              district: apt.medicalEstablishment.region,
            },
            slot: {
              startTime: apt.slot?.startTime || "09:00",
              endTime: apt.slot?.endTime || "17:00",
            },
          })),
          featuredCampaigns: featuredCampaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            type: campaign.type,
            location: campaign.location,
            description: campaign.description,
            startTime: campaign.startTime.toISOString(),
            endTime: campaign.endTime.toISOString(),
            expectedDonors: campaign.expectedDonors,
            actualDonors: campaign.actualDonors,
            imageUrl: campaign.imageUrl,
            isActive: campaign.isActive,
            organizer: {
              id: campaign.organizer.id,
              name: campaign.organizer.name,
            },
            medicalEstablishment: campaign.medicalEstablishment,
            participantCount: campaign._count.participations,
          })),
          emergencies: emergencies.map((emergency) => ({
            id: emergency.id,
            title: emergency.title,
            description: emergency.description,
            bloodTypesNeeded: emergency.bloodTypesNeeded,
            quantityNeeded: emergency.quantityNeeded,
            urgencyLevel: emergency.urgencyLevel,
            status: emergency.status,
            expiresAt: emergency.expiresAt.toISOString(),
            contactNumber: emergency.contactNumber,
            specialInstructions: emergency.specialInstructions,
            hospital: emergency.hospital,
            createdAt: emergency.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      console.error("Home data error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch home data",
      });
    }
  },
};
