import { Router } from 'express';
import { BloodEquipmentController } from '../controllers/bloodEquipment.controller.js';

const router = Router();

router.post('/', BloodEquipmentController.create);
router.get('/', BloodEquipmentController.getAll);
router.get('/:id', BloodEquipmentController.getById);
router.put('/:id', BloodEquipmentController.update);
router.delete('/:id', BloodEquipmentController.delete);

export default router;
