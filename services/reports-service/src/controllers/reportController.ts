import { Router, Request, Response } from 'express';
import { ReportService } from '../services/reportService';
import { logger } from '../utils/logger';
import Joi from 'joi';

export const reportRoutes = Router();
const reportService = new ReportService();

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Get cost reports
 *     tags: [Reports]
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
reportRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(10),
      offset: Joi.number().integer().min(0).default(0)
    });

    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { limit, offset } = schema.validate(req.query).value;
    
    const reports = await reportService.getReports(limit, offset);
    
    res.json({ reports });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * @swagger
 * /reports/{id}:
 *   get:
 *     summary: Get a specific cost report
 *     tags: [Reports]
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
reportRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      id: Joi.string().required()
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const report = await reportService.getReportById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    logger.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

/**
 * @swagger
 * /reports/export/{id}:
 *   get:
 *     summary: Export a cost report
 *     tags: [Reports]
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
reportRoutes.get('/export/:id', async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      id: Joi.string().required(),
      format: Joi.string().valid('pdf', 'csv').required()
    });

    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { id } = req.params;
    const { format } = req.query as { format: 'pdf' | 'csv' };
    
    if (format === 'pdf') {
      const pdfBuffer = await reportService.exportReportAsPDF(id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report_${id}.pdf`);
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csvData = await reportService.exportReportAsCSV(id);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report_${id}.csv`);
      res.send(csvData);
    } else {
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    logger.error('Error exporting report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

export default reportRoutes;