import { Router } from 'express';
import { S3PricingService } from '../services/s3PricingService';
import { logger } from '../utils/logger';

const router = Router();
const s3Service = new S3PricingService();

router.post('/calculate', async(req, res, next) =& gt; {
    try {
        const result = await s3Service.calculateS3Cost(req.body);
        res.json(result);
    } catch (error) {
        logger.error('S3 calculation error:', error);
        next(error);
    }
});

export default router;