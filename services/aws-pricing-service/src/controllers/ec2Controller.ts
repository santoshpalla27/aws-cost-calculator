import { Router, Request, Response } from 'express';
import { EC2PricingService } from '../services/ec2PricingService';
import { logger } from '../utils/logger';
import Joi from 'joi';

export const ec2Routes = Router();

/**
 * @swagger
 * /ec2:
 *   post:
 *     summary: Calculate EC2 costs
 *     tags: [EC2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               instanceType:
 *                 type: string
 *               region:
 *                 type: string
 *               os:
 *                 type: string
 *               purchaseOption:
 *                 type: string
 *                 enum: [on-demand, reserved, spot]
 *               quantity:
 *                 type: number
 *               hoursPerMonth:
 *                 type: number
 *     responses:
 *       200:
 *         description: EC2 cost calculation result
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
ec2Routes.post('/', async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      instanceType: Joi.string().required(),
      region: Joi.string().required(),
      os: Joi.string().required(),
      purchaseOption: Joi.string().valid('on-demand', 'reserved', 'spot').required(),
      quantity: Joi.number().integer().min(1).default(1),
      hoursPerMonth: Joi.number().default(730) // 730 hours in a month
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      instanceType, 
      region, 
      os, 
      purchaseOption, 
      quantity, 
      hoursPerMonth 
    } = req.body;

    const pricingService = new EC2PricingService();
    const result = await pricingService.calculateEC2Cost(
      instanceType,
      region,
      os,
      purchaseOption,
      quantity,
      hoursPerMonth
    );

    res.json(result);
  } catch (error) {
    logger.error('EC2 pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate EC2 costs' });
  }
});

export default ec2Routes;