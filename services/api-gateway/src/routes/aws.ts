import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../middleware/logger';
import Joi from 'joi';

const router = Router();

/**
 * @swagger
 * /api/aws/ec2:
 *   post:
 *     summary: Calculate EC2 costs
 *     tags: [AWS]
 *     security:
 *       - bearerAuth: []
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
router.post('/ec2', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      instanceType: Joi.string().required(),
      region: Joi.string().required(),
      os: Joi.string().required(),
      purchaseOption: Joi.string().valid('on-demand', 'reserved', 'spot').required(),
      quantity: Joi.number().integer().min(1).default(1),
      hoursPerMonth: Joi.number().default(730)
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const response = await axios.post(
      `${config.services.awsPricing}/ec2`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    logger.error('AWS EC2 pricing error:', error);
    res.status(500).json({ error: 'Failed to calculate EC2 costs' });
  }
});

/**
 * @swagger
 * /api/aws/rds:
 *   post:
 *     summary: Calculate RDS costs
 *     tags: [AWS]
 *     security:
 *       - bearerAuth: []
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
router.post('/rds', authenticate, async (req: Request, res: Response) => {
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

    const response = await axios.post(
      `${config.services.awsPricing}/rds`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    logger.error('AWS RDS pricing error:', error);
    res.status(500).json({ error: 'Failed to calculate RDS costs' });
  }
});

/**
 * @swagger
 * /api/aws/s3:
 *   post:
 *     summary: Calculate S3 costs
 *     tags: [AWS]
 *     security:
 *       - bearerAuth: []
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
router.post('/s3', authenticate, async (req: Request, res: Response) => {
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

    const response = await axios.post(
      `${config.services.awsPricing}/s3`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    logger.error('AWS S3 pricing error:', error);
    res.status(500).json({ error: 'Failed to calculate S3 costs' });
  }
});

/**
 * @swagger
 * /api/aws/eks:
 *   post:
 *     summary: Calculate EKS costs
 *     tags: [AWS]
 *     security:
 *       - bearerAuth: []
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
router.post('/eks', authenticate, async (req: Request, res: Response) => {
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

    const response = await axios.post(
      `${config.services.awsPricing}/eks`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    logger.error('AWS EKS pricing error:', error);
    res.status(500).json({ error: 'Failed to calculate EKS costs' });
  }
});

export default router;