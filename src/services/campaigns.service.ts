import { Prisma, CampaignType, ApprovalStatus } from '@prisma/client';
import { CampaignRepository } from '../repositories/campaigns.repository.js';
import { NotificationService } from './notification.service.js';

interface CampaignFilters {
  status?: string;
  featured?: string;
  limit?: number;
  page?: number;
  organizerId?: string;
}

interface UpdateCampaignData {
  title?: string;
  description?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  expectedDonors?: number;
  contactPersonName?: string;
  contactPersonPhone?: string;
  requirements?: Prisma.InputJsonValue;
  isActive?: boolean;
  isApproved?: boolean | ApprovalStatus | string;
}

interface CreateCampaignData {
  title: string;
  type: string;
  location: string;
  motivation: string;
  description: string;
  startTime: string | Date;
  endTime: string | Date;
  expectedDonors: string | number;
  contactPersonName: string;
  contactPersonPhone: string;
  medicalEstablishmentId: string;
  requirements?: Prisma.InputJsonValue;
}

interface AttendanceFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export const CampaignService = {
  // Get all campaigns with filters
  getCampaigns: async (filters: CampaignFilters) => {
    try {
      const campaigns = await CampaignRepository.findMany(filters);
      
      if (!campaigns) {
        return {
          success: true,
          data: {
            campaigns: [],
            pagination: {
              currentPage: filters.page || 1,
              totalPages: 0,
              totalItems: 0,
            },
          },
        };
      }

      return {
        success: true,
        data: campaigns,
      };
    } catch (error) {
      console.error('Campaign service error:', error);
      throw new Error('Failed to fetch campaigns');
    }
  },

  // Get upcoming campaigns
  getUpcomingCampaigns: async (filters: CampaignFilters) => {
    try {
      const campaigns = await CampaignRepository.findUpcoming(filters);
      
      if (!campaigns) {
        return {
          success: true,
          data: {
            campaigns: [],
          },
        };
      }

      return {
        success: true,
        data: campaigns,
      };
    } catch (error) {
      console.error('Upcoming campaigns service error:', error);
      throw new Error('Failed to fetch upcoming campaigns');
    }
  },

  // Get campaigns by organizer
  getCampaignsByOrganizer: async (organizerId: string, filters: CampaignFilters) => {
    try {
      const campaigns = await CampaignRepository.findByOrganizer(organizerId, filters);
      
      if (!campaigns) {
        return {
          success: true,
          campaigns: [],
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 10,
            total: 0,
            totalPages: 0,
          },
        };
      }

      return {
        success: true,
        ...campaigns,
      };
    } catch (error) {
      console.error('Organizer campaigns service error:', error);
      throw new Error('Failed to fetch organizer campaigns');
    }
  },

  // Create new campaign
  createCampaign: async (campaignData: CreateCampaignData, organizerId: string) => {
    try {
      const campaign = await CampaignRepository.create({
        title: campaignData.title,
        type: campaignData.type as CampaignType, // CampaignType enum
        location: campaignData.location,
        motivation: campaignData.motivation,
        description: campaignData.description,
        startTime: new Date(campaignData.startTime),
        endTime: new Date(campaignData.endTime),
        expectedDonors: typeof campaignData.expectedDonors === 'string' 
          ? parseInt(campaignData.expectedDonors) 
          : campaignData.expectedDonors,
        contactPersonName: campaignData.contactPersonName,
        contactPersonPhone: campaignData.contactPersonPhone,
        requirements: campaignData.requirements,
        isApproved: false, // Requires approval
        organizer: { connect: { id: organizerId } },
        medicalEstablishment: { connect: { id: campaignData.medicalEstablishmentId } },
      });

      return {
        success: true,
        campaign,
      };
    } catch (error) {
      console.error('Create campaign service error:', error);
      throw new Error('Failed to create campaign');
    }
  },

  // Update campaign
  updateCampaign: async (campaignId: string, updateData: UpdateCampaignData, userId: string) => {
    try {
      // Check permissions first
      const permissions = await CampaignService.checkCampaignPermissions(campaignId, userId);
      
      if (!permissions.canEdit) {
        throw new Error(permissions.reasons?.[0] || 'Cannot edit this campaign');
      }

      const campaign = await CampaignRepository.update(campaignId, updateData);

      return {
        success: true,
        campaign,
      };
    } catch (error) {
      console.error('Update campaign service error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update campaign');
    }
  },

  // Delete campaign
  deleteCampaign: async (campaignId: string, userId: string) => {
    try {
      // Check permissions first
      const permissions = await CampaignService.checkCampaignPermissions(campaignId, userId);
      
      if (!permissions.canDelete) {
        throw new Error(permissions.reasons?.[0] || 'Cannot delete this campaign');
      }

      // Get campaign details for notifications
      const campaign = await CampaignRepository.findById(campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Notify registered donors about cancellation
      const participants = await CampaignRepository.getCampaignParticipants(campaignId);
      
      for (const participant of participants) {
        await NotificationService.createCampaignNotification(
          participant.userId,
          campaignId,
          campaign.title,
          'CAMPAIGN_CANCELLED',
          'Campaign Cancelled',
          `The campaign "${campaign.title}" has been cancelled. We apologize for any inconvenience.`,
          { reason: 'Organizer cancelled the campaign' }
        );
      }

      // Delete the campaign
      await CampaignRepository.delete(campaignId);

      return {
        success: true,
        message: 'Campaign deleted successfully',
      };
    } catch (error) {
      console.error('Delete campaign service error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete campaign');
    }
  },

  // Get campaign analytics
  getCampaignAnalytics: async (campaignId: string) => {
    try {
      const analytics = await CampaignRepository.getAnalytics(campaignId);
      
      if (!analytics) {
        throw new Error('Campaign not found');
      }

      return {
        success: true,
        analytics,
      };
    } catch (error) {
      console.error('Campaign analytics service error:', error);
      throw new Error('Failed to fetch campaign analytics');
    }
  },

  // Get full campaign details by id
  getCampaignDetails: async (campaignId: string) => {
    try {
      const campaign = await CampaignRepository.findById(campaignId);
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

  // repository has more analytics if needed; currently compute basic stats from participations

      // Count attendance and donations via participations provided on campaign
      const attendanceCount = campaign.participations.filter(p => p.attendanceMarked).length;
      const donationCount = campaign.participations.filter(p => p.donationCompleted).length;

      const goalProgress = campaign.expectedDonors > 0
        ? Math.round((donationCount / campaign.expectedDonors) * 100)
        : 0;

      const campaignDetails = {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        location: campaign.location,
        startDate: campaign.startTime.toISOString(),
        endDate: campaign.endTime.toISOString(),
        goalBloodUnits: campaign.expectedDonors,
        currentBloodUnits: donationCount,
        status: campaign.isActive ? 'active' : 'completed',
        organizer: {
          id: campaign.organizerId,
          name: campaign.organizer.name,
          email: campaign.organizer.email,
          phone: campaign.contactPersonPhone,
          organization: 'Department of Health',
        },
        medicalEstablishment: {
          id: campaign.medicalEstablishment.id,
          name: campaign.medicalEstablishment.name,
          address: campaign.medicalEstablishment.address,
          contactNumber: campaign.contactPersonPhone,
        },
        requirements: campaign.requirements || {},
        stats: {
          totalDonors: campaign.participations.length,
          totalAttendance: attendanceCount,
          screenedPassed: attendanceCount,
          currentDonations: donationCount,
          goalProgress,
        },
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      };

      return { success: true, campaign: campaignDetails };
    } catch (error) {
      console.error('Get campaign details service error:', error);
      throw new Error('Failed to fetch campaign details');
    }
  },

  // Get pending campaigns filtered by blood bank id
  getPendingByMedicalEstablishment: async (medicalEstablishmentId: string, params: { page?: number; limit?: number } = {}) => {
    try {
      const data = await CampaignRepository.findPendingByMedicalEstablishment(medicalEstablishmentId, params);
      return { success: true, data };
    } catch (error) {
      console.error('Get pending by medical establishment service error:', error);
      throw new Error('Failed to fetch pending campaigns for medical establishment');
    }
  },

  // Set approval status for a campaign
  setCampaignApproval: async (campaignId: string, approval: string, userId?: string) => {
    try {
      // Normalize approval value
      const normalized = approval.toString().toUpperCase();

      let statusValue;
      if (normalized === 'ACCEPTED' || normalized === 'APPROVED') {
        statusValue = ApprovalStatus.ACCEPTED;
      } else if (normalized === 'REJECTED' || normalized === 'CANCELLED') {
        statusValue = ApprovalStatus.CANCELLED;
      } else {
        return { success: false, statusCode: 400, error: 'Invalid approval value' };
      }

      // Update status via repository (repository.updateStatus accepts statusData)
  const updated = await CampaignRepository.updateApproval(campaignId, statusValue);

      // Optionally create activity/notification (best-effort)
      try {
        const actorId = userId || 'system';
        const { ActivityService } = await import('../services/activity.service.js');
        await ActivityService.createActivity({
          userId: actorId,
          type: (statusValue === ApprovalStatus.ACCEPTED ? 'CAMPAIGN_APPROVED' : 'CAMPAIGN_REJECTED') as unknown as never,
          title: statusValue === ApprovalStatus.ACCEPTED ? 'Campaign Approved' : 'Campaign Rejected',
          description: `Campaign ${updated.title} was ${statusValue.toLowerCase()} by ${actorId}`,
          metadata: { campaignId, approval: statusValue },
        });
      } catch (actErr) {
        console.warn('Activity creation failed:', actErr);
      }

      return { success: true, campaign: updated };
    } catch (error) {
      console.error('Set campaign approval service error:', error);
      return { success: false, error: 'Failed to update campaign approval' };
    }
  },

  // Check campaign permissions
  checkCampaignPermissions: async (campaignId: string, userId: string) => {
    try {
      const campaign = await CampaignRepository.findById(campaignId);
      
      if (!campaign) {
        return {
          canEdit: false,
          canDelete: false,
          reasons: ['Campaign not found'],
        };
      }

      const reasons: string[] = [];
      let canEdit = true;
      let canDelete = true;

      // Check if user is the organizer
      if (campaign.organizerId !== userId) {
        canEdit = false;
        canDelete = false;
        reasons.push('You are not the organizer of this campaign');
      }

      // Check if campaign has linked blood donations
      const hasBloodDonations = await CampaignRepository.hasLinkedBloodDonations(campaignId);
      if (hasBloodDonations) {
        canEdit = false;
        canDelete = false;
        reasons.push('Campaign has linked blood donations');
      }

      // Check campaign status
      const now = new Date();
      const isActive = campaign.startTime <= now && campaign.endTime >= now;
      const isCompleted = campaign.endTime < now;

      if (isCompleted) {
        canEdit = false;
        canDelete = false;
        reasons.push('Campaign has been completed');
      }

      if (isActive) {
        canDelete = false;
        reasons.push('Cannot delete an active campaign');
      }

      return {
        canEdit,
        canDelete,
        reasons: reasons.length > 0 ? reasons : undefined,
      };
    } catch (error) {
      console.error('Check permissions service error:', error);
      return {
        canEdit: false,
        canDelete: false,
        reasons: ['Error checking permissions'],
      };
    }
  },

  // Get campaign statistics
  getCampaignStats: async (campaignId: string) => {
    try {
      const stats = await CampaignRepository.getStats(campaignId);
      
      if (!stats) {
        throw new Error('Campaign not found');
      }

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Campaign stats service error:', error);
      throw new Error('Failed to fetch campaign statistics');
    }
  },

  // Join campaign
  joinCampaign: async (campaignId: string, userId: string) => {
    try {
      const result = await CampaignRepository.addParticipant(campaignId, userId);
      
      return {
        success: true,
        participationId: result.id,
      };
    } catch (error) {
      console.error('Join campaign service error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to join campaign');
    }
  },

  // Mark attendance
  markAttendance: async (campaignId: string, userId: string, donationCompleted = false) => {
    try {
      const participation = await CampaignRepository.markAttendance(campaignId, userId, donationCompleted);
      
      return {
        success: true,
        participation,
      };
    } catch (error) {
      console.error('Mark attendance service error:', error);
      throw new Error('Failed to mark attendance');
    }
  },

  // Get campaign attendance
  getCampaignAttendance: async (campaignId: string, filters: AttendanceFilters) => {
    try {
      const attendance = await CampaignRepository.getAttendance(campaignId, filters);
      
      return {
        success: true,
        ...attendance,
      };
    } catch (error) {
      console.error('Get attendance service error:', error);
      throw new Error('Failed to fetch campaign attendance');
    }
  },

  // Get pending campaigns (awaiting approval)
  getPendingCampaigns: async (filters: { page?: number; limit?: number }) => {
    try {
      const pending = await CampaignRepository.findPending(filters);
      if (!pending) {
        return {
          success: true,
          data: {
            campaigns: [],
            pagination: {
              page: filters.page || 1,
              limit: filters.limit || 10,
              total: 0,
              totalPages: 0,
            },
          },
        };
      }

      return {
        success: true,
        data: pending,
      };
    } catch (error) {
      console.error('Get pending campaigns service error:', error);
      throw new Error('Failed to fetch pending campaigns');
    }
  },

  // Update campaign status
  updateCampaignStatus: async (campaignId: string, statusData: { isActive?: boolean; isApproved?: boolean | ApprovalStatus | string }) => {
    try {
      // Map isApproved to enum if provided
      let mappedApproval: ApprovalStatus | undefined = undefined;
      if (statusData.isApproved !== undefined) {
        const v = statusData.isApproved;
        if (typeof v === 'boolean') mappedApproval = v ? ApprovalStatus.ACCEPTED : ApprovalStatus.CANCELLED;
        else if (typeof v === 'string') {
          const up = v.toUpperCase();
          if (up === 'PENDING' || up === 'ACCEPTED' || up === 'CANCELLED') mappedApproval = up as ApprovalStatus;
        } else mappedApproval = v;
      }

      const campaign = await CampaignRepository.updateStatus(campaignId, {
        isActive: statusData.isActive,
        isApproved: mappedApproval,
      });
      
      return {
        success: true,
        campaign,
      };
    } catch (error) {
      console.error('Update status service error:', error);
      throw new Error('Failed to update campaign status');
    }
  },

  // Manual attendance marking
  manualAttendanceMarking: async (campaignId: string, attendees: Array<{ userId: string; donationCompleted?: boolean }>) => {
    try {
      const results = await CampaignRepository.bulkMarkAttendance(campaignId, attendees);
      
      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error('Manual attendance service error:', error);
      throw new Error('Failed to mark attendance manually');
    }
  },
};