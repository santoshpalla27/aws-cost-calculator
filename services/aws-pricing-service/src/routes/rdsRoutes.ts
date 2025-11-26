import { Router } from 'express';
import { RDSPricingService } from '../services/rdsPricingService';
import { logger } from '../utils/logger';

const router = Router();
const rdsService = new RDSPricingService();

router.post('/calculate', async(req, res, next) =& gt; {
    try {
        const result = await rdsService.calculateRDSCost(req.body);
        res.json(result);
    } catch (error) {
        logger.error('RDS calculation error:', error);
        next(error);
    }
});

export default router;