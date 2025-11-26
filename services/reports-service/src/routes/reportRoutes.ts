import { Router } from 'express';
import { reportController } from '../controllers/reportController';

const router = Router();

router.post('/', reportController.createReport.bind(reportController));
router.get('/', reportController.getReports.bind(reportController));
router.get('/trends', reportController.getCostTrends.bind(reportController));
router.get('/:id', reportController.getReport.bind(reportController));
router.delete('/:id', reportController.deleteReport.bind(reportController));
router.get('/:id/export/pdf', reportController.exportPDF.bind(reportController));
router.get('/:id/export/csv', reportController.exportCSV.bind(reportController));

export default router;