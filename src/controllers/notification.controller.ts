import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { NotificationSettings } from '../types/notification.types.js';

export const NotificationController = {
  // GET /notifications/campaigns
  getCampaignNotifications: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const {
        organizerId,
        campaignId,
        type,
        priority,
        isRead,
        page = '1',
        limit = '20',
        dateFrom,
        dateTo,
      } = req.query;

      const filters = {
        organizerId: organizerId as string || userId,
        campaignId: campaignId as string,
        type: type ? (Array.isArray(type) ? type as string[] : [type as string]) : undefined,
        priority: priority ? (Array.isArray(priority) ? priority as string[] : [priority as string]) : undefined,
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      };

      const result = await NotificationService.getNotifications(filters);
      res.status(200).json(result);
    } catch (error) {
      console.error('Get campaign notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch notifications',
      });
    }
  },

  // PATCH /notifications/:id/read
  markAsRead: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await NotificationService.markAsRead(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      if ((error as Error).message === 'Notification not found') {
        res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Notification not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to mark notification as read',
        });
      }
    }
  },

  // PATCH /notifications/batch-read
  batchMarkAsRead: async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationIds } = req.body;

      if (!notificationIds || !Array.isArray(notificationIds)) {
        res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'notificationIds array is required',
        });
        return;
      }

      const result = await NotificationService.batchMarkAsRead(notificationIds);
      res.status(200).json(result);
    } catch (error) {
      console.error('Batch mark as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to mark notifications as read',
      });
    }
  },

  // PATCH /notifications/campaigns/:campaignId/read-all
  markAllCampaignAsRead: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { campaignId } = req.params;
      const result = await NotificationService.markAllCampaignAsRead(userId, campaignId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Mark all campaign notifications as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to mark all campaign notifications as read',
      });
    }
  },

  // DELETE /notifications/:id
  deleteNotification: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await NotificationService.deleteNotification(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Delete notification error:', error);
      if ((error as Error).message === 'Notification not found') {
        res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Notification not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to delete notification',
        });
      }
    }
  },

  // GET /notifications/settings
  getNotificationSettings: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const result = await NotificationService.getNotificationSettings(userId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Get notification settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch notification settings',
      });
    }
  },

  // PATCH /notifications/settings
  updateNotificationSettings: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const settings = req.body as NotificationSettings;
      const result = await NotificationService.updateNotificationSettings(userId, settings);
      res.status(200).json(result);
    } catch (error) {
      console.error('Update notification settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update notification settings',
      });
    }
  },

  // GET /notifications/unread-count
  getUnreadCount: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { organizerId, campaignId } = req.query;
      const result = await NotificationService.getUnreadCount(
        organizerId as string || userId,
        campaignId as string
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch unread count',
      });
    }
  },

  // POST /notifications/test
  sendTestNotification: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { campaignId, type } = req.body;

      if (!campaignId || !type) {
        res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'campaignId and type are required',
        });
        return;
      }

      const result = await NotificationService.sendTestNotification(userId, { campaignId, type });
      res.status(200).json(result);
    } catch (error) {
      console.error('Send test notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to send test notification',
      });
    }
  },

  // GET /notifications/stats
  getNotificationStats: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { organizerId, from, to } = req.query;
      const result = await NotificationService.getNotificationStats(
        organizerId as string || userId,
        from ? new Date(from as string) : undefined,
        to ? new Date(to as string) : undefined
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch notification statistics',
      });
    }
  },
};