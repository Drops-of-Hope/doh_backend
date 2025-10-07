import { Router } from 'express';
import { BloodDonationController } from '../controllers/bloodDonation.controller';

const router = Router();

router.post('/', BloodDonationController.add);

export default router;
