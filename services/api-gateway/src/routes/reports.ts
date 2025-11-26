import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../middleware/logger';

const router = Router();

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all cost reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const response = await axios.get(
            `\${config.services.reports}/api/reports`,
            {
                headers: { 'Authorization': req.headers.authorization },
                params: req.query
            }
        );

        res.json(response.data);
    } catch (error: any) {
        logger.error('Get reports error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get specific report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const response = await axios.get(
            `\${config.services.reports}/api/reports/\${req.params.id}`,
            {
                headers: { 'Authorization': req.headers.authorization }
            }
        );

        res.json(response.data);
    } catch (error: any) {
        logger.error('Get report error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

/**
 * @swagger
 * /api/reports/{id}/export/pdf:
 *   get:
 *     summary: Export report as PDF
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/export/pdf', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const response = await axios.get(
            `\${config.services.reports}/api/reports/\${req.params.id}/export/pdf`,
            {
                headers: { 'Authorization': req.headers.authorization },
                responseType: 'stream'
            }
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report-\${req.params.id}.pdf`);
        response.data.pipe(res);
    } catch (error: any) {
        logger.error('Export PDF error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

/**
 * @swagger
 * /api/reports/{id}/export/csv:
 *   get:
 *     summary: Export report as CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/export/csv', authenticate, async (req: Request, res: Response, next: NextFunction) =& gt; {
    try {
        const response = await axios.get(
            `\${config.services.reports}/api/reports/\${req.params.id}/export/csv`,
            {
                headers: { 'Authorization': req.headers.authorization },
                responseType: 'stream'
            }
        );

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=report-\${req.params.id}.csv`);
        response.data.pipe(res);
    } catch (error: any) {
        logger.error('Export CSV error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
});

export default router;