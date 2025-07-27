import { Router } from 'express';
import dummyRoutes from './dummy.routes';

const router = Router();

router.use('/dummies', dummyRoutes);

export default router;
