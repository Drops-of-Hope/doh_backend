import { Router } from 'express';
import { HealthVitalsController } from '../controllers/healthVitals.controller.js';

const router = Router();

router.post('/', HealthVitalsController.create);
router.get('/:appointmentId', HealthVitalsController.getByAppointmentId);

export default router;
