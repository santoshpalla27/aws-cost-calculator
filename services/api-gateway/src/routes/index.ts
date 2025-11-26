import { Router } from 'express';
import healthRouter from './health';
import terraformRouter from './terraform';
import awsRouter from './aws';
import reportsRouter from './reports';

const router = Router();

router.use('/health', healthRouter);
router.use('/terraform', terraformRouter);
router.use('/aws', awsRouter);
router.use('/reports', reportsRouter);

export default router;