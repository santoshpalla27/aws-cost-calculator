/**
 * Admin Controller
 * Handles HTTP requests for admin-related endpoints
 */

const adminService = require('../services/admin.service');

const adminController = {
  /**
   * GET /api/v1/admin/dashboard
   */
  async getDashboardStats(req, res, next) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const logs = await adminService.getAuditLogs(req.query);
      res.json({
        success: true,
        ...logs,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminController;