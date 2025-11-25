/**
 * Leaderboard Repository
 * Data access layer for leaderboard operations
 */

const { query } = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const leaderboardRepository = {
  /**
   * Get leaderboard by category and period
   */
  async getLeaderboard(category = null, period = 'all_time', limit = 100, offset = 0) {
    let whereClause = 'WHERE l.period = $1';
    const params = [period];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND l.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    params.push(limit, offset);

    const result = await query(
      `SELECT l.*, u.username, u.avatar_url,
              RANK() OVER (ORDER BY l.total_score DESC) as rank
       FROM leaderboard l
       JOIN users u ON l.user_id = u.id
       ${whereClause}
       ORDER BY l.total_score DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return result.rows;
  },

  /**
   * Get user's rank
   */
  async getUserRank(userId, category = null, period = 'all_time') {
    let whereClause = 'WHERE l.period = $1';
    const params = [period];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND l.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    params.push(userId);

    const result = await query(
      `WITH ranked AS (
         SELECT l.*, RANK() OVER (ORDER BY l.total_score DESC) as rank
         FROM leaderboard l
         ${whereClause}
       )
       SELECT * FROM ranked WHERE user_id = $${paramIndex}`,
      params
    );

    return result.rows[0] || null;
  },

  /**
   * Update or create leaderboard entry
   */
  async upsertEntry(userId, category, score, completedType) {
    const periods = ['all_time', 'monthly', 'weekly', 'daily'];
    
    for (const period of periods) {
      await query(
        `INSERT INTO leaderboard (id, user_id, category, total_score, 
                                  quizzes_completed, scenarios_completed, puzzles_completed, period)
         VALUES ($1, $2, $3, $4, 
                 CASE WHEN $5 = 'quiz' THEN 1 ELSE 0 END,
                 CASE WHEN $5 = 'scenario' THEN 1 ELSE 0 END,
                 CASE WHEN $5 = 'puzzle' THEN 1 ELSE 0 END,
                 $6)
         ON CONFLICT (user_id, category, period)
         DO UPDATE SET
           total_score = leaderboard.total_score + $4,
           quizzes_completed = leaderboard.quizzes_completed + CASE WHEN $5 = 'quiz' THEN 1 ELSE 0 END,
           scenarios_completed = leaderboard.scenarios_completed + CASE WHEN $5 = 'scenario' THEN 1 ELSE 0 END,
           puzzles_completed = leaderboard.puzzles_completed + CASE WHEN $5 = 'puzzle' THEN 1 ELSE 0 END,
           updated_at = CURRENT_TIMESTAMP`,
        [generateUUID(), userId, category, score, completedType, period]
      );
    }
  },

  /**
   * Get user's statistics across all categories
   */
  async getUserStats(userId) {
    const result = await query(
      `SELECT category, period, total_score, quizzes_completed, 
              scenarios_completed, puzzles_completed, average_score, best_streak
       FROM leaderboard
       WHERE user_id = $1
       ORDER BY period, category`,
      [userId]
    );

    // Group by period
    const stats = {};
    result.rows.forEach((row) => {
      if (!stats[row.period]) {
        stats[row.period] = {};
      }
      stats[row.period][row.category || 'overall'] = row;
    });

    return stats;
  },

  /**
   * Get top performers
   */
  async getTopPerformers(category = null, period = 'all_time', limit = 10) {
    let whereClause = 'WHERE l.period = $1';
    const params = [period];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND l.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    params.push(limit);

    const result = await query(
      `SELECT l.*, u.username, u.avatar_url
       FROM leaderboard l
       JOIN users u ON l.user_id = u.id
       ${whereClause}
       ORDER BY l.total_score DESC
       LIMIT $${paramIndex}`,
      params
    );

    return result.rows;
  },

  /**
   * Reset periodic leaderboards
   */
  async resetPeriod(period) {
    await query(
      `UPDATE leaderboard
       SET total_score = 0, quizzes_completed = 0, scenarios_completed = 0,
           puzzles_completed = 0, updated_at = CURRENT_TIMESTAMP
       WHERE period = $1`,
      [period]
    );
  },
};

module.exports = leaderboardRepository;