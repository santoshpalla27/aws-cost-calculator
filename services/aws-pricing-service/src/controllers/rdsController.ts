import { Router, Request, Response } from 'express';
import { RDSPricingService } from '../services/rdsPricingService';
import { logger } from '../utils/logger';
import Joi from 'joi';

export const rdsRoutes = Router();

/**
 * @swagger
 * /rds:
 *   post:
 *     summary: Calculate RDS costs
 *     tags: [RDS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               engine:
 *                 type: string
 *               instanceClass:
 *                 type: string
 *               region:
 *                 type: string
 *               storageType:
 *                 type: string
 *               storageSize:
 *                 type: number
 *               multiAZ:
 *                 type: boolean
 *               backupStorage:
 *                 type: number
 *     responses:
 *       200:
 *         description: RDS cost calculation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 monthlyCost:
 *                   type: number
 *                 hourlyCost:
 *                   type: number
 *                 breakdown:
 *                   type: object
 */
rdsRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      engine: Joi.string().required(),
      instanceClass: Joi.string().required(),
      region: Joi.string().required(),
      storageType: Joi.string().required(),
      storageSize: Joi.number().integer().min(20).default(100),
      multiAZ: Joi.boolean().default(false),
      backupStorage: Joi.number().default(0)
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      engine, 
      instanceClass, 
      region, 
      storageType, 
      storageSize, 
      multiAZ, 
      backupStorage 
    } = req.body;

    const pricingService = new RDSPricingService();
    const result = await pricingService.calculateRDSCost(
      engine,
      instanceClass,
      region,
      storageType,
      storageSize,
      multiAZ,
      backupStorage
    );

    res.json(result);
  } catch (error) {
    logger.error('RDS pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate RDS costs' });
  }
});

export default rdsRoutes;