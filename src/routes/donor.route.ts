import { Router } from 'express';
import { DonorController } from '../controllers/donor.controller.js';

const router = Router();

// GET /api/donors/location-count - Get donor counts grouped by district
router.get('/location-count', DonorController.getDonorCountsByDistrict);

export default router;
