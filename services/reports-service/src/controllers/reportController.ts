import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/reportService';
import { pdfGenerator } from '../services/pdfGenerator';
import { csvExporter } from '../services/csvExporter';
import { logger } from '../utils/logger';
import * as fs from 'fs';

export class ReportController {
    async createReport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id;
            const { type, name, data, totalMonthlyCost, metadata } = req.body;

            const report = await reportService.createReport(
                userId,
                type,
                name,
                data,
                totalMonthlyCost,
                metadata
            );

            res.status(201).json(report);
        } catch (error) {
            logger.error('Create report error:', error);
            next(error);
        }
    }

    async getReports(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id;
            const filters = req.query;

            const reports = await reportService.getReports(userId, filters);

            res.json(reports);
        } catch (error) {
            logger.error('Get reports error:', error);
            next(error);
        }
    }

    async getReport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id;
            const { id } = req.params;

            const report = await reportService.getReportById(id, userId);

            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }

            res.json(report);
        } catch (error) {
            logger.error('Get report error:', error);
            next(error);
        }
    }

    async deleteReport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id;
            const { id } = req.params;

            const deleted = await reportService.deleteReport(id, userId);

            if (!deleted) {
                return res.status(404).json({ error: 'Report not found' });
            }

            res.json({ message: 'Report deleted successfully' });
        } catch (error) {
            logger.error('Delete report error:', error);
            next(error);
        }
    }

    async exportPDF(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id;
            const { id } = req.params;

            const report = await reportService.getReportById(id, userId);

            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }

            const doc = pdfGenerator.generateReportPDF(report);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-\${id}.pdf`);

            doc.pipe(res);
            doc.end();
        } catch (error) {
            logger.error('Export PDF error:', error);
            next(error);
        }
    }

    async exportCSV(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id;
            const { id } = req.params;

            const report = await reportService.getReportById(id, userId);

            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }

            const filePath = await csvExporter.exportReportToCSV(report);

            res.download(filePath, `report-\${id}.csv`, (err) =& gt; {
                if (err) {
                    logger.error('Download error:', err);
                }
                // Cleanup
                fs.unlinkSync(filePath);
            });
        } catch (error) {
            logger.error('Export CSV error:', error);
            next(error);
        }
    }

    async getCostTrends(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id;
            const days = parseInt(req.query.days as string) || 30;

            const trends = await reportService.getCostTrends(userId, days);

            res.json(trends);
        } catch (error) {
            logger.error('Get cost trends error:', error);
            next(error);
        }
    }
}

export const reportController = new ReportController();