import { Router } from 'express';
import { EKSPricingService } from '../services/eksPricingService';
import { logger } from '../utils/logger';

const router = Router();
const eksService = new EKSPricingService();

router.post('/calculate', async(req, res, next) =& gt; {
    try {
        const result = await eksService.calculateEKSCost(req.body);
        res.json(result);
    } catch (error) {
        logger.error('EKS calculation error:', error);
        next(error);
    }
});

export default router;