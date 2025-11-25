/**
 * Puzzle Repository
 * Data access layer for puzzle-related operations
 */

const { query, withTransaction } = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const puzzleRepository = {
  /**
   * Find puzzle by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT p.*, u.username as created_by_username
       FROM aws_architecture_puzzles p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find all puzzles with filters
   */
  async findAll(filters) {
    const {
      type,
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
      conditions.push(`p.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (type) {
      conditions.push(`p.puzzle_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (difficulty) {
      conditions.push(`p.difficulty = $${paramIndex}`);
      params.push(difficulty);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      conditions.push(`p.tags && $${paramIndex}`);
      params.push(tagArray);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM aws_architecture_puzzles p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results with component count
    params.push(limit, offset);
    const result = await query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM puzzle_items pi WHERE pi.puzzle_id = p.id) as component_count
       FROM aws_architecture_puzzles p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return { puzzles: result.rows, total };
  },

  /**
   * Create puzzle
   */
  async create(puzzleData, createdBy) {
    const id = generateUUID();
    const {
      title,
      description,
      puzzleType,
      difficulty,
      targetArchitecture,
      requirements,
      hints,
      timeLimitSeconds,
      maxAttempts,
      tags,
    } = puzzleData;

    const result = await query(
      `INSERT INTO aws_architecture_puzzles (id, title, description, puzzle_type, difficulty,
                                             target_architecture, requirements, hints,
                                             time_limit_seconds, max_attempts, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [id, title, description, puzzleType, difficulty,
       JSON.stringify(targetArchitecture), requirements, hints,
       timeLimitSeconds, maxAttempts, tags, createdBy]
    );

    return result.rows[0];
  },

  /**
   * Update puzzle
   */
  async update(id, updates) {
    const allowedFields = [
      'title', 'description', 'puzzle_type', 'difficulty', 'target_architecture',
      'requirements', 'hints', 'time_limit_seconds', 'max_attempts', 'tags', 'is_active'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        const processedValue = snakeKey === 'target_architecture'
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
      `UPDATE aws_architecture_puzzles SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  /**
   * Delete puzzle (soft delete)
   */
  async delete(id) {
    const result = await query(
      `UPDATE aws_architecture_puzzles SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    return result.rowCount > 0;
  },

  /**
   * Get puzzle items
   */
  async getItems(puzzleId) {
    const result = await query(
      `SELECT * FROM puzzle_items
       WHERE puzzle_id = $1
       ORDER BY is_required DESC, component_type ASC`,
      [puzzleId]
    );
    return result.rows;
  },

  /**
   * Get item by ID
   */
  async getItem(itemId) {
    const result = await query(
      `SELECT * FROM puzzle_items WHERE id = $1`,
      [itemId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create puzzle item
   */
  async createItem(puzzleId, itemData) {
    const id = generateUUID();
    const {
      componentType,
      componentName,
      expectedPosition,
      expectedConnections,
      properties,
      isRequired,
      isProvided,
      iconUrl,
    } = itemData;

    const result = await query(
      `INSERT INTO puzzle_items (id, puzzle_id, component_type, component_name,
                                expected_position, expected_connections, properties,
                                is_required, is_provided, icon_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, puzzleId, componentType, componentName,
       JSON.stringify(expectedPosition), JSON.stringify(expectedConnections),
       JSON.stringify(properties), isRequired, isProvided, iconUrl]
    );

    return result.rows[0];
  },

  /**
   * Update puzzle item
   */
  async updateItem(itemId, updates) {
    const allowedFields = [
      'component_type', 'component_name', 'expected_position', 'expected_connections',
      'properties', 'is_required', 'is_provided', 'icon_url'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        const processedValue = ['expected_position', 'expected_connections', 'properties'].includes(snakeKey)
          ? JSON.stringify(value)
          : value;
        values.push(processedValue);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(itemId);
    const result = await query(
      `UPDATE puzzle_items SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  /**
   * Delete puzzle item
   */
  async deleteItem(itemId) {
    const result = await query(
      `DELETE FROM puzzle_items WHERE id = $1 RETURNING id`,
      [itemId]
    );
    return result.rowCount > 0;
  },

  /**
   * Create puzzle attempt
   */
  async createAttempt(userId, puzzleId, maxScore) {
    const id = generateUUID();
    const result = await query(
      `INSERT INTO puzzle_attempts (id, user_id, puzzle_id, max_score, submitted_architecture)
       VALUES ($1, $2, $3, $4, '{}')
       RETURNING *`,
      [id, userId, puzzleId, maxScore]
    );
    return result.rows[0];
  },

  /**
   * Get puzzle attempt by ID
   */
  async getAttempt(attemptId) {
    const result = await query(
      `SELECT pa.*, p.title as puzzle_title, p.puzzle_type, p.difficulty,
              p.target_architecture, p.requirements
       FROM puzzle_attempts pa
       JOIN aws_architecture_puzzles p ON pa.puzzle_id = p.id
       WHERE pa.id = $1`,
      [attemptId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update puzzle attempt
   */
  async updateAttempt(attemptId, updates) {
    const {
      submittedArchitecture,
      score,
      percentage,
      correctComponents,
      correctConnections,
      missingComponents,
      incorrectConnections,
      timeTakenSeconds,
      status,
      feedback,
    } = updates;

    const result = await query(
      `UPDATE puzzle_attempts
       SET submitted_architecture = COALESCE($1, submitted_architecture),
           score = COALESCE($2, score),
           percentage = COALESCE($3, percentage),
           correct_components = COALESCE($4, correct_components),
           correct_connections = COALESCE($5, correct_connections),
           missing_components = COALESCE($6, missing_components),
           incorrect_connections = COALESCE($7, incorrect_connections),
           time_taken_seconds = COALESCE($8, time_taken_seconds),
           status = COALESCE($9, status),
           feedback = COALESCE($10, feedback),
           completed_at = CASE WHEN $9 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $11
       RETURNING *`,
      [submittedArchitecture ? JSON.stringify(submittedArchitecture) : null,
       score, percentage, correctComponents, correctConnections,
       missingComponents, incorrectConnections, timeTakenSeconds,
       status, feedback ? JSON.stringify(feedback) : null, attemptId]
    );

    return result.rows[0];
  },

  /**
   * Get user's attempts for a puzzle
   */
  async getUserAttempts(userId, puzzleId) {
    const result = await query(
      `SELECT * FROM puzzle_attempts
       WHERE user_id = $1 AND puzzle_id = $2
       ORDER BY started_at DESC`,
      [userId, puzzleId]
    );
    return result.rows;
  },

  /**
   * Count user's completed attempts for a puzzle
   */
  async countUserAttempts(userId, puzzleId) {
    const result = await query(
      `SELECT COUNT(*) FROM puzzle_attempts
       WHERE user_id = $1 AND puzzle_id = $2 AND status = 'completed'`,
      [userId, puzzleId]
    );
    return parseInt(result.rows[0].count, 10);
  },
};

module.exports = puzzleRepository;