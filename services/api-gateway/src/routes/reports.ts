import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../middleware/logger';
import Joi from 'joi';

const router = Router();

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get cost reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of cost reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       totalCost:
 *                         type: number
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(10),
      offset: Joi.number().integer().min(0).default(0)
    });

    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const response = await axios.get(
      `${config.services.reports}/reports`,
      {
        params: req.query,
        headers: {
          'Authorization': req.headers.authorization
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get a specific cost report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cost report details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 data:
 *                   type: object
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      id: Joi.string().required()
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const response = await axios.get(
      `${config.services.reports}/reports/${req.params.id}`,
      {
        headers: {
          'Authorization': req.headers.authorization
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    logger.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

/**
 * @swagger
 * /api/reports/export/{id}:
 *   get:
 *     summary: Export a cost report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pdf, csv]
 *     responses:
 *       200:
 *         description: Exported report file
 */
router.get('/export/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      id: Joi.string().required(),
      format: Joi.string().valid('pdf', 'csv').required()
    });

    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const response = await axios.get(
      `${config.services.reports}/reports/export/${req.params.id}`,
      {
        params: req.query,
        headers: {
          'Authorization': req.headers.authorization
        },
        responseType: 'stream'
      }
    );

    // Pipe the response to the client
    response.data.pipe(res);
  } catch (error) {
    logger.error('Export report error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

export default router;