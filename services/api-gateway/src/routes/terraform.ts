import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../middleware/logger';
import Joi from 'joi';

const router = Router();

/**
 * @swagger
 * /api/terraform/estimate:
 *   post:
 *     summary: Estimate Terraform infrastructure costs
 *     tags: [Terraform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: string
 *                 enum: [files, git, plan_json]
 *               gitUrl:
 *                 type: string
 *               branch:
 *                 type: string
 *               terraformFiles:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *               planJson:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cost estimation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalMonthlyCost:
 *                   type: number
 *                 resources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       monthlyCost:
 *                         type: number
 */
router.post('/estimate', authenticate, async (req: Request, res: Response) => {
  try {
    const { source, gitUrl, branch, terraformFiles, planJson } = req.body;

    // Validate input
    const schema = Joi.object({
      source: Joi.string().valid('files', 'git', 'plan_json').required(),
      gitUrl: Joi.string().uri().when('source', { is: 'git', then: Joi.required(), otherwise: Joi.optional() }),
      branch: Joi.string().when('source', { is: 'git', then: Joi.string().default('main'), otherwise: Joi.optional() }),
      terraformFiles: Joi.object().when('source', { is: 'files', then: Joi.required(), otherwise: Joi.optional() }),
      planJson: Joi.string().when('source', { is: 'plan_json', then: Joi.required(), otherwise: Joi.optional() })
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Forward to terraform-cost-engine service
    const response = await axios.post(
      `${config.services.terraformCost}/estimate`,
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
    logger.error('Terraform estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate costs' });
  }
});

/**
 * @swagger
 * /api/terraform/diff:
 *   post:
 *     summary: Get cost difference between two Terraform configurations
 *     tags: [Terraform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               baseConfig:
 *                 type: object
 *               newConfig:
 *                 type: object
 *     responses:
 *       200:
 *         description: Cost difference result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 addedCost:
 *                   type: number
 *                 deletedCost:
 *                   type: number
 *                 modifiedCost:
 *                   type: number
 *                 totalDiff:
 *                   type: number
 */
router.post('/diff', authenticate, async (req: Request, res: Response) => {
  try {
    const { baseConfig, newConfig } = req.body;

    const schema = Joi.object({
      baseConfig: Joi.object().required(),
      newConfig: Joi.object().required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const response = await axios.post(
      `${config.services.terraformCost}/diff`,
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
    logger.error('Terraform diff error:', error);
    res.status(500).json({ error: 'Failed to calculate diff' });
  }
});

export default router;