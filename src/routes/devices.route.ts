import { Router } from 'express';
import { DevicesController } from '../controllers/devices.controller.js';
import { authenticateToken } from '../middlewares/authenticateUser.js';
import {
  validateRequest,
  pushTokenSchema,
  pushTokenDeleteSchema,
} from '../middlewares/validateRequest.js';

const router = Router();

router.post(
  '/push-token',
  authenticateToken,
  validateRequest(pushTokenSchema),
  DevicesController.registerPushToken
);
router.delete(
  '/push-token',
  authenticateToken,
  validateRequest(pushTokenDeleteSchema),
  DevicesController.deletePushToken
);

export default router;
