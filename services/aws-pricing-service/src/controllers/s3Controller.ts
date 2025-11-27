import { Router, Request, Response } from 'express';
import { S3PricingService } from '../services/s3PricingService';
import { logger } from '../utils/logger';
import Joi from 'joi';

export const s3Routes = Router();

/**
 * @swagger
 * /s3:
 *   post:
 *     summary: Calculate S3 costs
 *     tags: [S3]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storageClass:
 *                 type: string
 *               storageSize:
 *                 type: number
 *               monthlyRequests:
 *                 type: number
 *               monthlyDataTransfer:
 *                 type: number
 *               region:
 *                 type: string
 *     responses:
 *       200:
 *         description: S3 cost calculation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 monthlyCost:
 *                   type: number
 *                 breakdown:
 *                   type: object
 */
s3Routes.post('/', async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      storageClass: Joi.string().required(),
      storageSize: Joi.number().min(0).default(100),
      monthlyRequests: Joi.number().min(0).default(0),
      monthlyDataTransfer: Joi.number().min(0).default(0),
      region: Joi.string().default('us-east-1')
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      storageClass, 
      storageSize, 
      monthlyRequests, 
      monthlyDataTransfer, 
      region 
    } = req.body;

    const pricingService = new S3PricingService();
    const result = await pricingService.calculateS3Cost(
      storageClass,
      storageSize,
      monthlyRequests,
      monthlyDataTransfer,
      region
    );

    res.json(result);
  } catch (error) {
    logger.error('S3 pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate S3 costs' });
  }
});

export default s3Routes;