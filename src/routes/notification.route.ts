import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middlewares/authenticateUser.js';

const router = Router();

// GET /notifications/campaigns - Get campaign notifications with filters
router.get('/campaigns', authenticateToken, NotificationController.getCampaignNotifications);

// GET /notifications/user - Get user notifications with pagination (for mobile app)
router.get('/user', authenticateToken, NotificationController.getUserNotifications);

// PATCH /notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authenticateToken, NotificationController.markAsRead);

// PUT /notifications/:notificationId/read - Alternative route for mobile app
router.put('/:notificationId/read', authenticateToken, NotificationController.markAsRead);

// PATCH /notifications/batch-read - Mark multiple notifications as read
router.patch('/batch-read', authenticateToken, NotificationController.batchMarkAsRead);

// PATCH /notifications/campaigns/:campaignId/read-all - Mark all campaign notifications as read
router.patch('/campaigns/:campaignId/read-all', authenticateToken, NotificationController.markAllCampaignAsRead);

// DELETE /notifications/:id - Delete notification
router.delete('/:id', authenticateToken, NotificationController.deleteNotification);

// GET /notifications/settings - Get notification preferences
router.get('/settings', authenticateToken, NotificationController.getNotificationSettings);

// PATCH /notifications/settings - Update notification preferences
router.patch('/settings', authenticateToken, NotificationController.updateNotificationSettings);

// GET /notifications/unread-count - Get unread notification count
router.get('/unread-count', authenticateToken, NotificationController.getUnreadCount);

// POST /notifications/test - Send test notification (development/testing)
router.post('/test', authenticateToken, NotificationController.sendTestNotification);

// GET /notifications/stats - Get notification statistics
router.get('/stats', authenticateToken, NotificationController.getNotificationStats);

export default router;