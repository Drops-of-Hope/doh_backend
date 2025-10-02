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
  getDashboard: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Get user stats
      const userStats = await prisma.userHomeStats.findUnique({
        where: { userId },
      });

      // Get upcoming appointments
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          donorId: userId,
          appointmentDate: {
            gte: new Date(),
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

      res.status(200).json({
        data: {
          userStats: userStats || {
            totalDonations: 0,
            totalPoints: 0,
            donationStreak: 0,
            lastDonationDate: null,
            eligibleToDonate: true,
            nextEligibleDate: null,
            nextAppointmentDate: upcomingAppointments[0]?.appointmentDate || null,
            nextAppointmentId: upcomingAppointments[0]?.id || null,
          },
          upcomingAppointments: upcomingAppointments.map(apt => ({
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
          emergencies: emergencies.map(emergency => ({
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
          featuredCampaigns: featuredCampaigns.map(campaign => ({
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

      res.status(200).json({
        data: {
          totalDonations: userStats.totalDonations,
          totalPoints: userStats.totalPoints,
          donationStreak: userStats.donationStreak,
          lastDonationDate: userStats.lastDonationDate,
          eligibleToDonate: userStats.eligibleToDonate,
          nextEligibleDate: userStats.nextEligibleDate,
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
};