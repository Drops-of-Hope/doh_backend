import { Router } from 'express';
import { AppointmentSlotsController } from '../controllers/appointmentSlots.controller';

const router = Router();

router.post('/', AppointmentSlotsController.create);
router.get('/:medicalEstablishmentId', AppointmentSlotsController.getByMedicalEstablishmentId);

export default router;