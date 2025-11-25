/**
 * Admin Service
 * Business logic for admin operations
 */

const userRepository = require('../repositories/user.repository');
const quizRepository = require('../repositories/quiz.repository');
const scenarioRepository = require('../repositories/scenario.repository');
const puzzleRepository = require('../repositories/puzzle.repository');
const auditRepository = require('../repositories/audit.repository');
const { buildPaginationResponse } = require('../utils/helpers');

const adminService = {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const totalUsers = await userRepository.findAll({ limit: 1, page: 1, isActive: null });
    const totalQuizzes = await quizRepository.findAll({ limit: 1, page: 1, isActive: null });
    const totalScenarios = await scenarioRepository.findAll({ limit: 1, page: 1, isActive: null });
    const totalPuzzles = await puzzleRepository.findAll({ limit: 1, page: 1, isActive: null });

    return {
      totalUsers: totalUsers.total,
      totalQuizzes: totalQuizzes.total,
      totalScenarios: totalScenarios.total,
      totalPuzzles: totalPuzzles.total,
      // Add more stats as needed
    };
  },

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters) {
    const { logs, total } = await auditRepository.findAll(filters);
    return buildPaginationResponse(logs, total, filters.page, filters.limit);
  },
};

module.exports = adminService;