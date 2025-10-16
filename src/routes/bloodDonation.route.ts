import { Router } from 'express';
import { BloodDonationController } from '../controllers/bloodDonation.controller.js';

const router = Router();

router.post('/', BloodDonationController.add);

export default router;
