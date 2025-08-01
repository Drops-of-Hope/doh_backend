import { Router } from 'express';
import { AppointmentSlotsController } from '../controllers/appointmentSlots.controller';

const router = Router();

router.post('/', AppointmentSlotsController.create);

export default router;