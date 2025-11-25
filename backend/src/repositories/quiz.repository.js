/**
 * Quiz Repository
 * Data access layer for quiz-related operations
 */

const { query, withTransaction } = require('../config/database');
const { generateUUID, shuffleArray } = require('../utils/helpers');

const quizRepository = {
  /**
   * Find quiz by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT q.*, u.username as created_by_username
       FROM quizzes q
       LEFT JOIN users u ON q.created_by = u.id
       WHERE q.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find all quizzes with filters
   */
  async findAll(filters) {
    const {
      category,
      difficulty,
      page = 1,
      limit = 20,
      search,
      tags,
      sortBy = 'created_at',
      sortOrder = 'desc',
      isActive = true,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (isActive !== null) {
      conditions.push(`q.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (category) {
      conditions.push(`q.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (difficulty) {
      conditions.push(`q.difficulty = $${paramIndex}`);
      params.push(difficulty);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(q.title ILIKE $${paramIndex} OR q.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      conditions.push(`q.tags && $${paramIndex}`);
      params.push(tagArray);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY q.${sortBy} ${sortOrder.toUpperCase()}`;

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM quizzes q ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results with question count
    params.push(limit, offset);
    const result = await query(
      `SELECT q.*, 
              (SELECT COUNT(*) FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.is_active = true) as question_count
       FROM quizzes q
       ${whereClause}
       ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return { quizzes: result.rows, total };
  },

  /**
   * Create quiz
   */
  async create(quizData, createdBy) {
    const id = generateUUID();
    const {
      title,
      description,
      category,
      difficulty,
      timeLimitSeconds,
      passingScore,
      isRandomized,
      maxAttempts,
      tags,
    } = quizData;

    const result = await query(
      `INSERT INTO quizzes (id, title, description, category, difficulty, time_limit_seconds,
                           passing_score, is_randomized, max_attempts, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id, title, description, category, difficulty, timeLimitSeconds,
       passingScore, isRandomized, maxAttempts, tags, createdBy]
    );

    return result.rows[0];
  },

  /**
   * Update quiz
   */
  async update(id, updates) {
    const allowedFields = [
      'title', 'description', 'category', 'difficulty', 'time_limit_seconds',
      'passing_score', 'is_randomized', 'max_attempts', 'tags', 'is_active'
    ];
    
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    // Increment version on update
    setClauses.push(`version = version + 1`);

    values.push(id);
    const result = await query(
      `UPDATE quizzes SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  /**
   * Delete quiz (soft delete)
   */
  async delete(id) {
    const result = await query(
      `UPDATE quizzes SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    return result.rowCount > 0;
  },

  /**
   * Get quiz questions
   */
  async getQuestions(quizId, randomize = false) {
    const result = await query(
      `SELECT id, question_text, options, difficulty, tags, time_limit_seconds, points, question_order
       FROM quiz_options
       WHERE quiz_id = $1 AND is_active = true
       ORDER BY question_order ASC`,
      [quizId]
    );

    let questions = result.rows;

    if (randomize) {
      questions = shuffleArray(questions);
      // Also shuffle options for each question
      questions = questions.map((q) => ({
        ...q,
        options: shuffleArray(q.options),
      }));
    }

    return questions;
  },

  /**
   * Get quiz question with correct answer (for evaluation)
   */
  async getQuestionWithAnswer(questionId) {
    const result = await query(
      `SELECT * FROM quiz_options WHERE id = $1`,
      [questionId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create quiz question
   */
  async createQuestion(quizId, questionData) {
    const id = generateUUID();
    const {
      questionText,
      questionOrder,
      options,
      explanation,
      hint,
      difficulty,
      tags,
      timeLimitSeconds,
      points,
    } = questionData;

    // Extract correct option IDs
    const correctOptionIds = options
      .filter((opt) => opt.isCorrect)
      .map((opt) => opt.id);

    const result = await query(
      `INSERT INTO quiz_options (id, quiz_id, question_text, question_order, options,
                                correct_option_ids, explanation, hint, difficulty, tags,
                                time_limit_seconds, points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [id, quizId, questionText, questionOrder, JSON.stringify(options),
       correctOptionIds, explanation, hint, difficulty, tags, timeLimitSeconds, points]
    );

    return result.rows[0];
  },

  /**
   * Update quiz question
   */
  async updateQuestion(questionId, updates) {
    const allowedFields = [
      'question_text', 'question_order', 'options', 'correct_option_ids',
      'explanation', 'hint', 'difficulty', 'tags', 'time_limit_seconds', 'points', 'is_active'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(snakeKey === 'options' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(questionId);
    const result = await query(
      `UPDATE quiz_options SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  /**
   * Delete quiz question
   */
  async deleteQuestion(questionId) {
    const result = await query(
      `UPDATE quiz_options SET is_active = false WHERE id = $1 RETURNING id`,
      [questionId]
    );
    return result.rowCount > 0;
  },

  /**
   * Create quiz attempt
   */
  async createAttempt(userId, quizId, totalQuestions, ipAddress = null) {
    const id = generateUUID();
    const result = await query(
      `INSERT INTO quiz_attempts (id, user_id, quiz_id, total_questions, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, quizId, totalQuestions, ipAddress]
    );
    return result.rows[0];
  },

  /**
   * Get quiz attempt by ID
   */
  async getAttempt(attemptId) {
    const result = await query(
      `SELECT qa.*, q.title as quiz_title, q.category, q.difficulty,
              q.time_limit_seconds, q.passing_score
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.id = $1`,
      [attemptId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update quiz attempt
   */
  async updateAttempt(attemptId, updates) {
    const {
      score,
      correctAnswers,
      percentage,
      timeTakenSeconds,
      answers,
      status,
    } = updates;

    const result = await query(
      `UPDATE quiz_attempts
       SET score = COALESCE($1, score),
           correct_answers = COALESCE($2, correct_answers),
           percentage = COALESCE($3, percentage),
           time_taken_seconds = COALESCE($4, time_taken_seconds),
           answers = COALESCE($5, answers),
           status = COALESCE($6, status),
           completed_at = CASE WHEN $6 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $7
       RETURNING *`,
      [score, correctAnswers, percentage, timeTakenSeconds, 
       answers ? JSON.stringify(answers) : null, status, attemptId]
    );

    return result.rows[0];
  },

  /**
   * Get user's attempts for a quiz
   */
  async getUserAttempts(userId, quizId) {
    const result = await query(
      `SELECT * FROM quiz_attempts
       WHERE user_id = $1 AND quiz_id = $2
       ORDER BY started_at DESC`,
      [userId, quizId]
    );
    return result.rows;
  },

  /**
   * Count user's completed attempts for a quiz
   */
  async countUserAttempts(userId, quizId) {
    const result = await query(
      `SELECT COUNT(*) FROM quiz_attempts
       WHERE user_id = $1 AND quiz_id = $2 AND status = 'completed'`,
      [userId, quizId]
    );
    return parseInt(result.rows[0].count, 10);
  },

  /**
   * Get in-progress attempt
   */
  async getInProgressAttempt(userId, quizId) {
    const result = await query(
      `SELECT * FROM quiz_attempts
       WHERE user_id = $1 AND quiz_id = $2 AND status = 'in_progress'
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId, quizId]
    );
    return result.rows[0] || null;
  },
};

module.exports = quizRepository;