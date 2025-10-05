import { prisma } from '../config/db.js';
import { UserSearchFilters, DonorSearchResult, RecentDonorsRequest, FrequentDonorsRequest } from '../types/userSearch.types.js';
import { Prisma, BloodGroup, District } from '@prisma/client';

export const UserSearchRepository = {
  // Search users with filters
  searchUsers: async (filters: UserSearchFilters) => {
    const {
      q,
      bloodGroup,
      eligibleOnly,
      minDonations,
      page = 1,
      limit = 20,
      district,
      city,
      isActive,
    } = filters;

    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    // Text search across multiple fields
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { nic: { contains: q, mode: 'insensitive' } },
        {
          userDetails: {
            phoneNumber: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    // Blood group filter
    if (bloodGroup) {
      where.bloodGroup = bloodGroup as BloodGroup;
    }

    // Active status filter
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Minimum donations filter
    if (minDonations !== undefined) {
      where.totalDonations = { gte: minDonations };
    }

    // Location filters
    if (district || city) {
      where.userDetails = {
        ...(district && { district: district as District }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
      };
    }

    // Eligibility filter
    if (eligibleOnly) {
      where.nextEligible = { lte: new Date() };
      where.isActive = true;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { totalDonations: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          userDetails: {
            select: {
              phoneNumber: true,
              address: true,
              city: true,
              district: true,
              emergencyContact: true,
            },
          },
          bloodDonations: {
            take: 1,
            orderBy: { startTime: 'desc' },
            select: { startTime: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user): DonorSearchResult => ({
        id: user.id,
        name: user.name,
        email: user.email,
        nic: user.nic,
        bloodGroup: user.bloodGroup,
        totalDonations: user.totalDonations,
        totalPoints: user.totalPoints,
        isActive: user.isActive,
        nextEligible: user.nextEligible ?? undefined,
        profileImageUrl: user.profileImageUrl ?? undefined,
        userDetails: user.userDetails ? {
          phoneNumber: user.userDetails.phoneNumber ?? undefined,
          address: user.userDetails.address,
          city: user.userDetails.city,
          district: user.userDetails.district,
          emergencyContact: user.userDetails.emergencyContact ?? undefined,
        } : undefined,
        lastDonationDate: user.bloodDonations[0]?.startTime,
        donationBadge: user.donationBadge,
        eligibleToDonate: user.nextEligible ? user.nextEligible <= new Date() : true,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Get user profile with detailed information
  getUserProfile: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userDetails: true,
        bloodDonations: {
          take: 5,
          orderBy: { startTime: 'desc' },
          select: {
            id: true,
            startTime: true,
            pointsEarned: true,
          },
        },
        appointments: {
          take: 5,
          orderBy: { appointmentDate: 'desc' },
          include: {
            medicalEstablishment: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
        campaignParticipations: {
          take: 5,
          orderBy: { registrationDate: 'desc' },
          include: {
            campaign: {
              select: {
                title: true,
                startTime: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      nic: user.nic,
      bloodGroup: user.bloodGroup,
      totalDonations: user.totalDonations,
      totalPoints: user.totalPoints,
      isActive: user.isActive,
      nextEligible: user.nextEligible ?? undefined,
      profileImageUrl: user.profileImageUrl ?? undefined,
      donationBadge: user.donationBadge,
      eligibleToDonate: user.nextEligible ? user.nextEligible <= new Date() : true,
      userDetails: user.userDetails ? {
        phoneNumber: user.userDetails.phoneNumber,
        address: user.userDetails.address,
        city: user.userDetails.city,
        district: user.userDetails.district,
        emergencyContact: user.userDetails.emergencyContact,
      } : undefined,
      recentDonations: user.bloodDonations.map(donation => ({
        id: donation.id,
        date: donation.startTime,
        location: 'Blood Bank', // Default location
        bloodGroup: user.bloodGroup,
        status: 'COMPLETED', // No status field in schema, default to completed
      })),
      upcomingAppointments: user.appointments.map(appointment => ({
        id: appointment.id,
        date: appointment.appointmentDate,
        location: appointment.medicalEstablishment?.name || 'Medical Center',
        status: appointment.scheduled,
      })),
      campaignParticipations: user.campaignParticipations.map(participation => ({
        id: participation.id,
        campaignTitle: participation.campaign.title,
        registrationDate: participation.registrationDate,
        status: participation.status,
        attendanceMarked: participation.attendanceMarked,
        donationCompleted: participation.donationCompleted,
      })),
    };
  },

    // Get recent donors
  getRecentDonors: async (filters: RecentDonorsRequest) => {
    const { campaignId, limit = 10, days = 30 } = filters;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Prisma.UserWhereInput = {
      isActive: true,
      bloodDonations: {
        some: {
          startTime: { gte: since },
        },
      },
    };

    // If campaignId provided, filter by campaign participants
    if (campaignId) {
      where.campaignParticipations = {
        some: {
          campaignId,
          donationCompleted: true,
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      take: limit,
      orderBy: [
        { bloodDonations: { _count: 'desc' } },
        { totalDonations: 'desc' },
      ],
      include: {
        userDetails: {
          select: {
            phoneNumber: true,
            address: true,
            city: true,
            district: true,
          },
        },
        bloodDonations: {
          take: 1,
          orderBy: { startTime: 'desc' },
          select: { startTime: true },
        },
      },
    });

    return users.map((user): DonorSearchResult => ({
      id: user.id,
      name: user.name,
      email: user.email,
      nic: user.nic,
      bloodGroup: user.bloodGroup,
      totalDonations: user.totalDonations,
      totalPoints: user.totalPoints,
      isActive: user.isActive,
      nextEligible: user.nextEligible ?? undefined,
      profileImageUrl: user.profileImageUrl ?? undefined,
      userDetails: user.userDetails ? {
        phoneNumber: user.userDetails.phoneNumber ?? undefined,
        address: user.userDetails.address,
        city: user.userDetails.city,
        district: user.userDetails.district,
        emergencyContact: undefined,
      } : undefined,
      lastDonationDate: user.bloodDonations[0]?.startTime,
      donationBadge: user.donationBadge,
      eligibleToDonate: user.nextEligible ? user.nextEligible <= new Date() : true,
    }));
  },

  // Get frequent donors
  getFrequentDonors: async (filters: FrequentDonorsRequest) => {
    const { limit = 10, minDonations = 3, timeframe = '1year' } = filters;
    
    const since = new Date();
    switch (timeframe) {
      case '3months':
        since.setMonth(since.getMonth() - 3);
        break;
      case '6months':
        since.setMonth(since.getMonth() - 6);
        break;
      case '1year':
      default:
        since.setFullYear(since.getFullYear() - 1);
        break;
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        totalDonations: { gte: minDonations },
        bloodDonations: {
          some: {
            startTime: { gte: since },
          },
        },
      },
      take: limit,
      orderBy: [
        { totalDonations: 'desc' },
        { totalPoints: 'desc' },
      ],
      include: {
        userDetails: {
          select: {
            phoneNumber: true,
            address: true,
            city: true,
            district: true,
          },
        },
        bloodDonations: {
          take: 1,
          orderBy: { startTime: 'desc' },
          select: { startTime: true },
        },
      },
    });

    return users.map((user): DonorSearchResult => ({
      id: user.id,
      name: user.name,
      email: user.email,
      nic: user.nic,
      bloodGroup: user.bloodGroup,
      totalDonations: user.totalDonations,
      totalPoints: user.totalPoints,
      isActive: user.isActive,
      nextEligible: user.nextEligible ?? undefined,
      profileImageUrl: user.profileImageUrl ?? undefined,
      userDetails: user.userDetails ? {
        phoneNumber: user.userDetails.phoneNumber ?? undefined,
        address: user.userDetails.address,
        city: user.userDetails.city,
        district: user.userDetails.district,
        emergencyContact: undefined,
      } : undefined,
      lastDonationDate: user.bloodDonations[0]?.startTime,
      donationBadge: user.donationBadge,
      eligibleToDonate: user.nextEligible ? user.nextEligible <= new Date() : true,
    }));
  },

  // Check user eligibility
  checkUserEligibility: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userDetails: true,
        bloodDonations: {
          take: 1,
          orderBy: { startTime: 'desc' },
        },
        appointments: {
          where: {
            scheduled: { in: ['PENDING'] },
            appointmentDate: { gte: new Date() },
          },
        },
      },
    });

    if (!user) return null;

    const eligibilityChecks = {
      ageRequirement: true, // Assume age is checked during registration
      weightRequirement: true, // Assume weight is adequate
      healthStatus: user.isActive,
      lastDonationGap: user.nextEligible ? user.nextEligible <= new Date() : true,
      activeAppointments: user.appointments?.length === 0,
    };

    const eligible = Object.values(eligibilityChecks).every(check => check);
    const restrictions: string[] = [];

    if (!eligibilityChecks.healthStatus) restrictions.push('Health status not active');
    if (!eligibilityChecks.lastDonationGap) restrictions.push('Too soon since last donation');
    if (!eligibilityChecks.activeAppointments) restrictions.push('Has active appointments');

    return {
      eligible,
      eligibilityChecks,
      restrictions: restrictions.length > 0 ? restrictions : undefined,
      nextEligibleDate: user.nextEligible ?? undefined,
    };
  },
};