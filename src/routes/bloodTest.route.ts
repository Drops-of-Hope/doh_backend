import { Router } from 'express';
import { BloodTestController } from '../controllers/bloodTest.controller';

const router = Router();

//route to get all blood units thats waiting to be tested for each medical establishment inventory
router.get('/:inventoryId', BloodTestController.findAll);

// Route to get blood unit info by blood unit ID
router.get('/unit/:bloodId', BloodTestController.findBloodUnit);

export default router;
