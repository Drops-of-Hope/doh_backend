import { Router } from 'express';
import dummyRoutes from './dummy.routes';
import appointmentSlotsRoutes from './appointmentSlots.route';

const router = Router();

router.use('/dummies', dummyRoutes);
router.use('/slots', appointmentSlotsRoutes);

export default router;
