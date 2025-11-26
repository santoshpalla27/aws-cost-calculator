import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../middleware/logger';
import Joi from 'joi';

const router = Router();

/**
 * @swagger
 * /api/aws/ec2/calculate:
 *   post:
 *     summary: Calculate EC2 instance costs
 *     tags: [AWS Calculators]
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
 *                 example: "t3.medium"
 *               region:
 *                 type: string
 *                 example: "us-east-1"
 *               osType:
 *                 type: string
 *                 enum: [Linux, Windows, RHEL, SUSE]
 *               tenancy:
 *                 type: string
 *                 enum: [Shared, Dedicated, Host]
 *               pricingModel:
 *                 type: string
 *                 enum: [OnDemand, Reserved, Spot]
 *               ebsVolumes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     size:
 *                       type: number
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cost calculation completed
 */
router.post('/ec2/calculate', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const schema = Joi.object({
            instanceType: Joi.string().required(),
            region: Joi.string().required(),
            osType: Joi.string().valid('Linux', 'Windows', 'RHEL', 'SUSE').default('Linux'),
            tenancy: Joi.string().valid('Shared', 'Dedicated', 'Host').default('Shared'),
            pricingModel: Joi.string().valid('OnDemand', 'Reserved', 'Spot').default('OnDemand'),
            ebsVolumes: Joi.array().items(Joi.object({
                type: Joi.string().valid('gp2', 'gp3', 'io1', 'io2', 'st1', 'sc1').required(),
                size: Joi.number().min(1).required(),
                iops: Joi.number().optional()
            })).default([]),
            quantity: Joi.number().min(1).default(1),
            hoursPerMonth: Joi.number().default(730),
            awsAccessKey: Joi.string().required(),
            awsSecretKey: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const response = await axios.post(
            `\${config.services.awsPricing}/api/ec2/calculate`,
            value,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json(response.data);
    } catch (error: any) {
        logger.error('EC2 calculation error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

/**
 * @swagger
 * /api/aws/rds/calculate:
 *   post:
 *     summary: Calculate RDS instance costs
 *     tags: [AWS Calculators]
 *     security:
 *       - bearerAuth: []
 */
router.post('/rds/calculate', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const schema = Joi.object({
            engine: Joi.string().valid('MySQL', 'PostgreSQL', 'MariaDB', 'Oracle', 'SQLServer', 'Aurora').required(),
            instanceClass: Joi.string().required(),
            region: Joi.string().required(),
            storageType: Joi.string().valid('gp2', 'gp3', 'io1', 'magnetic').required(),
            storageSize: Joi.number().min(20).required(),
            multiAZ: Joi.boolean().default(false),
            backupStorage: Joi.number().default(0),
            awsAccessKey: Joi.string().required(),
            awsSecretKey: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const response = await axios.post(
            `\${config.services.awsPricing}/api/rds/calculate`,
            value,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json(response.data);
    } catch (error: any) {
        logger.error('RDS calculation error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

/**
 * @swagger
 * /api/aws/s3/calculate:
 *   post:
 *     summary: Calculate S3 storage costs
 *     tags: [AWS Calculators]
 *     security:
 *       - bearerAuth: []
 */
router.post('/s3/calculate', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const schema = Joi.object({
            region: Joi.string().required(),
            storageClass: Joi.string().valid(
                'STANDARD',
                'INTELLIGENT_TIERING',
                'STANDARD_IA',
                'ONEZONE_IA',
                'GLACIER',
                'GLACIER_IR',
                'DEEP_ARCHIVE'
            ).required(),
            storageAmount: Joi.number().min(0).required(),
            putRequests: Joi.number().default(0),
            getRequests: Joi.number().default(0),
            dataTransferOut: Joi.number().default(0),
            awsAccessKey: Joi.string().required(),
            awsSecretKey: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const response = await axios.post(
            `\${config.services.awsPricing}/api/s3/calculate`,
            value,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json(response.data);
    } catch (error: any) {
        logger.error('S3 calculation error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

/**
 * @swagger
 * /api/aws/eks/calculate:
 *   post:
 *     summary: Calculate EKS cluster costs
 *     tags: [AWS Calculators]
 *     security:
 *       - bearerAuth: []
 */
router.post('/eks/calculate', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const schema = Joi.object({
            region: Joi.string().required(),
            clusterCount: Joi.number().min(1).default(1),
            nodeGroups: Joi.array().items(Joi.object({
                instanceType: Joi.string().required(),
                nodeCount: Joi.number().min(1).required(),
                storageSize: Joi.number().default(20)
            })).required(),
            fargateVCPU: Joi.number().default(0),
            fargateMemoryGB: Joi.number().default(0),
            awsAccessKey: Joi.string().required(),
            awsSecretKey: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const response = await axios.post(
            `\${config.services.awsPricing}/api/eks/calculate`,
            value,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json(response.data);
    } catch (error: any) {
        logger.error('EKS calculation error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

export default router;