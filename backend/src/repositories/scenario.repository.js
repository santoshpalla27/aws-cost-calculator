/**
 * Scenario Repository
 * Data access layer for scenario-related operations
 */

const { query, withTransaction } = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const scenarioRepository = {
  /**
   * Find scenario by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT s.*, u.username as created_by_username
       FROM scenario_questions s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find all scenarios with filters
   */
  async findAll(filters) {
    const {
      category,
      difficulty,
      page = 1,
      limit = 20,
      search,
      tags,
      isActive = true,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (isActive !== null) {
      conditions.push(`s.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (category) {
      conditions.push(`s.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (difficulty) {
      conditions.push(`s.difficulty = $${paramIndex}`);
      params.push(difficulty);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      conditions.push(`s.tags && $${paramIndex}`);
      params.push(tagArray);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM scenario_questions s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results with step count
    params.push(limit, offset);
    const result = await query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM scenario_steps st WHERE st.scenario_id = s.id) as step_count
       FROM scenario_questions s
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return { scenarios: result.rows, total };
  },

  /**
   * Create scenario
   */
  async create(scenarioData, createdBy) {
    const id = generateUUID();
    const {
      title,
      description,
      category,
      difficulty,
      symptoms,
      logs,
      context,
      environment,
      explanation,
      learningPoints,
      relatedDocs,
      timeLimitSeconds,
      maxAttempts,
      tags,
    } = scenarioData;

    const result = await query(
      `INSERT INTO scenario_questions (id, title, description, category, difficulty,
                                       symptoms, logs, context, environment,
                                       correct_resolution_steps, explanation, learning_points,
                                       related_docs, time_limit_seconds, max_attempts, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [id, title, description, category, difficulty,
       JSON.stringify(symptoms), logs, context ? JSON.stringify(context) : '{}',
       environment ? JSON.stringify(environment) : '{}',
       '{}', explanation, learningPoints, relatedDocs,
       timeLimitSeconds, maxAttempts, tags, createdBy]
    );

    return result.rows[0];
  },

  /**
   * Update scenario
   */
  async update(id, updates) {
    const allowedFields = [
      'title', 'description', 'category', 'difficulty', 'symptoms',
      'logs', 'context', 'environment', 'explanation', 'learning_points',
      'related_docs', 'time_limit_seconds', 'max_attempts', 'tags', 'is_active'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        const processedValue = ['symptoms', 'context', 'environment'].includes(snakeKey)
          ? JSON.stringify(value)
          : value;
        values.push(processedValue);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE scenario_questions SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  /**
   * Delete scenario (soft delete)
   */
  async delete(id) {
    const result = await query(
      `UPDATE scenario_questions SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    return result.rowCount > 0;
  },

  /**
   * Get scenario steps
   */
  async getSteps(scenarioId) {
    const result = await query(
      `SELECT * FROM scenario_steps
       WHERE scenario_id = $1
       ORDER BY step_order ASC`,
      [scenarioId]
    );
    return result.rows;
  },

  /**
   * Get step by ID
   */
  async getStep(stepId) {
    const result = await query(
      `SELECT * FROM scenario_steps WHERE id = $1`,
      [stepId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create scenario step
   */
  async createStep(scenarioId, stepData) {
    const id = generateUUID();
    const {
      stepOrder,
      actionText,
      actionCommand,
      isCorrect,
      feedbackCorrect,
      feedbackIncorrect,
      partialCredit,
      leadsToStepId,
    } = stepData;

    const result = await query(
      `INSERT INTO scenario_steps (id, scenario_id, step_order, action_text, action_command,
                                   is_correct, feedback_correct, feedback_incorrect,
                                   partial_credit, leads_to_step_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, scenarioId, stepOrder, actionText, actionCommand, isCorrect,
       feedbackCorrect, feedbackIncorrect, partialCredit, leadsToStepId]
    );

    return result.rows[0];
  },

  /**
   * Update correct resolution steps
   */
  async updateCorrectSteps(scenarioId, stepIds) {
    const result = await query(
      `UPDATE scenario_questions SET correct_resolution_steps = $1
       WHERE id = $2
       RETURNING id`,
      [stepIds, scenarioId]
    );
    return result.rowCount > 0;
  },

  /**
   * Create evaluation
   */
  async createEvaluation(userId, scenarioId, totalSteps, maxScore) {
    const id = generateUUID();
    const result = await query(
      `INSERT INTO scenario_evaluations (id, user_id, scenario_id, total_steps, max_score)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, scenarioId, totalSteps, maxScore]
    );
    return result.rows[0];
  },

  /**
   * Get evaluation by ID
   */
  async getEvaluation(evaluationId) {
    const result = await query(
      `SELECT se.*, sq.title as scenario_title, sq.category, sq.difficulty,
              sq.explanation, sq.learning_points
       FROM scenario_evaluations se
       JOIN scenario_questions sq ON se.scenario_id = sq.id
       WHERE se.id = $1`,
      [evaluationId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update evaluation
   */
  async updateEvaluation(evaluationId, updates) {
    const {
      score,
      percentage,
      stepsTaken,
      correctSteps,
      timeTakenSeconds,
      status,
      feedback,
    } = updates;

    const result = await query(
      `UPDATE scenario_evaluations
       SET score = COALESCE($1, score),
           percentage = COALESCE($2, percentage),
           steps_taken = COALESCE($3, steps_taken),
           correct_steps = COALESCE($4, correct_steps),
           time_taken_seconds = COALESCE($5, time_taken_seconds),
           status = COALESCE($6, status),
           feedback = COALESCE($7, feedback),
           completed_at = CASE WHEN $6 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $8
       RETURNING *`,
      [score, percentage, stepsTaken ? JSON.stringify(stepsTaken) : null,
       correctSteps, timeTakenSeconds, status, feedback, evaluationId]
    );

    return result.rows[0];
  },

  /**
   * Get user's evaluations for a scenario
   */
  async getUserEvaluations(userId, scenarioId) {
    const result = await query(
      `SELECT * FROM scenario_evaluations
       WHERE user_id = $1 AND scenario_id = $2
       ORDER BY started_at DESC`,
      [userId, scenarioId]
    );
    return result.rows;
  },

  /**
   * Count user's completed evaluations for a scenario
   */
  async countUserEvaluations(userId, scenarioId) {
    const result = await query(
      `SELECT COUNT(*) FROM scenario_evaluations
       WHERE user_id = $1 AND scenario_id = $2 AND status = 'completed'`,
      [userId, scenarioId]
    );
    return parseInt(result.rows[0].count, 10);
  },
};

module.exports = scenarioRepository;