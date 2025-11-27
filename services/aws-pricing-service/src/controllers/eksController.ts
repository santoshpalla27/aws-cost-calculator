import { Router, Request, Response } from 'express';
import { EKSPricingService } from '../services/eksPricingService';
import { logger } from '../utils/logger';
import Joi from 'joi';

export const eksRoutes = Router();

/**
 * @swagger
 * /eks:
 *   post:
 *     summary: Calculate EKS costs
 *     tags: [EKS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               region:
 *                 type: string
 *               nodeGroups:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     instanceType:
 *                       type: string
 *                     nodeCount:
 *                       type: number
 *                     hourlyHours:
 *                       type: number
 *     responses:
 *       200:
 *         description: EKS cost calculation result
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
eksRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      region: Joi.string().default('us-east-1'),
      nodeGroups: Joi.array().items(
        Joi.object({
          instanceType: Joi.string().required(),
          nodeCount: Joi.number().integer().min(1).required(),
          hourlyHours: Joi.number().min(0).default(730)
        })
      ).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { region, nodeGroups } = req.body;

    const pricingService = new EKSPricingService();
    const result = await pricingService.calculateEKSCost(
      region,
      nodeGroups
    );

    res.json(result);
  } catch (error) {
    logger.error('EKS pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate EKS costs' });
  }
});

export default eksRoutes;