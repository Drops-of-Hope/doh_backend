import { Router } from 'express';
import { DevicesController } from '../controllers/devices.controller.js';
import { authenticateToken } from '../middlewares/authenticateUser.js';

const router = Router();

router.post('/push-token', authenticateToken, DevicesController.registerPushToken);
router.delete('/push-token', authenticateToken, DevicesController.deletePushToken);

export default router;
