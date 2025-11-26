import { Router } from 'express';
import { EC2PricingService } from '../services/ec2PricingService';
import { logger } from '../utils/logger';

const router = Router();
const ec2Service = new EC2PricingService();

router.post('/calculate', async(req, res, next) =& gt; {
    try {
        const result = await ec2Service.calculateEC2Cost(req.body);
        res.json(result);
    } catch (error) {
        logger.error('EC2 calculation error:', error);
        next(error);
    }
});

export default router;