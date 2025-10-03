import { NotificationRepository } from '../repositories/notification.repository.js';
import { NotificationFilters, NotificationSettings, TestNotificationRequest } from '../types/notification.types.js';
import { Prisma } from '@prisma/client';

export const NotificationService = {
  // Get notifications with filters
  getNotifications: async (filters: NotificationFilters) => {
    const result = await NotificationRepository.findWithFilters(filters);
    
    return {
      success: true,
      notifications: result.notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        campaign: notification.metadata && typeof notification.metadata === 'object' && notification.metadata !== null && 'campaignId' in notification.metadata ? {
          id: (notification.metadata as Record<string, unknown>).campaignId as string,
          title: (notification.metadata as Record<string, unknown>).campaignTitle as string || 'Campaign',
        } : undefined,
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  },

  // Mark notification as read
  markAsRead: async (notificationId: string) => {
    const notification = await NotificationRepository.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    await NotificationRepository.markAsRead(notificationId);
    return {
      success: true,
      message: 'Notification marked as read',
    };
  },

  // Batch mark notifications as read
  batchMarkAsRead: async (notificationIds: string[]) => {
    await NotificationRepository.batchMarkAsRead(notificationIds);
    return {
      success: true,
      message: `${notificationIds.length} notifications marked as read`,
    };
  },

  // Mark all campaign notifications as read
  markAllCampaignAsRead: async (userId: string, campaignId: string) => {
    await NotificationRepository.markAllCampaignAsRead(userId, campaignId);
    return {
      success: true,
      message: 'All campaign notifications marked as read',
    };
  },

  // Delete notification
  deleteNotification: async (notificationId: string) => {
    const notification = await NotificationRepository.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    await NotificationRepository.delete(notificationId);
    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  },

  // Get unread count
  getUnreadCount: async (userId: string, campaignId?: string) => {
    const count = await NotificationRepository.getUnreadCount(userId, campaignId);
    return {
      count,
    };
  },

  // Get notification statistics
  getNotificationStats: async (userId: string, from?: Date, to?: Date) => {
    const stats = await NotificationRepository.getStats(userId, from, to);
    return {
      success: true,
      stats,
    };
  },

  // Get notification settings (mock implementation)
  getNotificationSettings: async (userId: string): Promise<{ success: boolean; settings: NotificationSettings }> => {
    // In production, this would fetch from a UserNotificationSettings table
    // For now, return default settings based on user preferences
    console.log(`Fetching notification settings for user: ${userId}`);
    
    return {
      success: true,
      settings: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        campaignUpdates: true,
        donorRegistrations: true,
        systemAlerts: true,
        weeklyReports: true,
        remindersBefore: 24,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
      },
    };
  },

  // Update notification settings (mock implementation)
  updateNotificationSettings: async (userId: string, settings: NotificationSettings) => {
    // This would typically update a user preferences table
    // For now, just return success
    return {
      success: true,
      message: 'Notification settings updated successfully',
      settings,
    };
  },

  // Send test notification
  sendTestNotification: async (userId: string, data: TestNotificationRequest) => {
    const notification = await NotificationRepository.create({
      userId,
      type: data.type,
      title: 'Test Notification',
      message: `This is a test notification for campaign ${data.campaignId}`,
      metadata: {
        campaignId: data.campaignId,
        isTest: true,
      },
    });

    return {
      success: true,
      message: 'Test notification sent successfully',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
      },
    };
  },

  // Create notification (helper method)
  createNotification: async (data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
  }) => {
    return await NotificationRepository.create(data);
  },

  // Helper method to create campaign notifications
  createCampaignNotification: async (
    userId: string,
    campaignId: string,
    campaignTitle: string,
    type: string,
    title: string,
    message: string,
    additionalMetadata?: Record<string, unknown>
  ) => {
    return await NotificationRepository.create({
      userId,
      type,
      title,
      message,
      metadata: {
        campaignId,
        campaignTitle,
        ...additionalMetadata,
      },
    });
  },
};