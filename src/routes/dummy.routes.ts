import { Router } from 'express';
import { DummyController } from '../controllers/dummy.controller';

const router = Router();

router.post('/', DummyController.create);
router.get('/', DummyController.findAll);
router.get('/:id', DummyController.findOne);
router.put('/:id', DummyController.update);
router.delete('/:id', DummyController.delete);

export default router;
