import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
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
 *               files:
 *                 type: object
 *               planJson:
 *                 type: object
 *     responses:
 *       200:
 *         description: Cost estimation completed
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/estimate', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const schema = Joi.object({
            source: Joi.string().valid('files', 'git', 'plan_json').required(),
            gitUrl: Joi.string().uri().when('source', { is: 'git', then: Joi.required() }),
            branch: Joi.string().default('main'),
            files: Joi.object().when('source', { is: 'files', then: Joi.required() }),
            planJson: Joi.object().when('source', { is: 'plan_json', then: Joi.required() }),
            awsRegion: Joi.string().default('us-east-1'),
            awsAccessKey: Joi.string().optional(),
            awsSecretKey: Joi.string().optional()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        logger.info('Terraform cost estimation request received', {
            source: value.source,
            userId: (req as any).user?.id
        });

        const response = await axios.post(
            `\${config.services.terraformCost}/api/estimate`,
            value,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                },
                timeout: 300000 // 5 minutes
            }
        );

        res.json(response.data);
    } catch (error: any) {
        logger.error('Terraform estimation error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

/**
 * @swagger
 * /api/terraform/diff:
 *   post:
 *     summary: Compare costs between two Terraform configurations
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
 *               baseline:
 *                 type: object
 *               compare:
 *                 type: object
 *     responses:
 *       200:
 *         description: Cost comparison completed
 */
router.post('/diff', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const schema = Joi.object({
            baseline: Joi.object().required(),
            compare: Joi.object().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        logger.info('Terraform diff request received', {
            userId: (req as any).user?.id
        });

        const response = await axios.post(
            `\${config.services.terraformCost}/api/diff`,
            value,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                },
                timeout: 300000
            }
        );

        res.json(response.data);
    } catch (error: any) {
        logger.error('Terraform diff error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

export default router;