import { Response } from 'express';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { PushService } from '../services/push.service.js';

export const DevicesController = {
  // POST /devices/push-token
  registerPushToken: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { token, platform } = req.body as { token?: string; platform?: string };

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!token) {
        res.status(400).json({ success: false, error: 'Token is required' });
        return;
      }

      await PushService.registerToken(userId, token, platform);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Register push token error:', error);
      res.status(500).json({ success: false, error: 'Failed to register token' });
    }
  },

  // DELETE /devices/push-token
  deletePushToken: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { token } = req.body as { token?: string };

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!token) {
        res.status(400).json({ success: false, error: 'Token is required' });
        return;
      }

      await PushService.deleteToken(userId, token);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete push token error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete token' });
    }
  },
};
