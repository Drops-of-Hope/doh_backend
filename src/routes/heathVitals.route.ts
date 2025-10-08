import { Router } from 'express';
import { HealthVitalsController } from '../controllers/healthVitals.controller';

const router = Router();

router.post('/', HealthVitalsController.create);

export default router;
