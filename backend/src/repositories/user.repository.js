/**
 * User Repository
 * Data access layer for user-related operations
 */

const { query, withTransaction } = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const userRepository = {
  /**
   * Find user by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT u.*, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const result = await query(
      `SELECT u.*, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find user by username
   */
  async findByUsername(username) {
    const result = await query(
      `SELECT u.*, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE LOWER(u.username) = LOWER($1)`,
      [username]
    );
    return result.rows[0] || null;
  },

  /**
   * Create new user
   */
  async create(userData) {
    const id = generateUUID();
    const {
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      roleId,
    } = userData;

    const result = await query(
      `INSERT INTO users (id, email, username, password_hash, first_name, last_name, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, email, username, passwordHash, firstName, lastName, roleId]
    );

    return result.rows[0];
  },

  /**
   * Update user
   */
  async update(id, updates) {
    const allowedFields = ['first_name', 'last_name', 'avatar_url', 'preferences', 'is_verified', 'is_active'];
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

    values.push(id);
    const result = await query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  /**
   * Update password
   */
  async updatePassword(id, passwordHash) {
    const result = await query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id`,
      [passwordHash, id]
    );
    return result.rowCount > 0;
  },

  /**
   * Update last login
   */
  async updateLastLogin(id) {
    await query(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP, login_count = login_count + 1
       WHERE id = $1`,
      [id]
    );
  },

  /**
   * Get default user role ID
   */
  async getDefaultRoleId() {
    const result = await query(
      `SELECT id FROM roles WHERE name = 'user' LIMIT 1`
    );
    return result.rows[0]?.id || null;
  },

  /**
   * Get role by name
   */
  async getRoleByName(name) {
    const result = await query(
      `SELECT * FROM roles WHERE name = $1`,
      [name]
    );
    return result.rows[0] || null;
  },

  /**
   * Check if email exists
   */
  async emailExists(email, excludeUserId = null) {
    let queryText = `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`;
    const params = [email];

    if (excludeUserId) {
      queryText += ` AND id != $2`;
      params.push(excludeUserId);
    }

    const result = await query(queryText, params);
    return result.rowCount > 0;
  },

  /**
   * Check if username exists
   */
  async usernameExists(username, excludeUserId = null) {
    let queryText = `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`;
    const params = [username];

    if (excludeUserId) {
      queryText += ` AND id != $2`;
      params.push(excludeUserId);
    }

    const result = await query(queryText, params);
    return result.rowCount > 0;
  },

  /**
   * List users with pagination
   */
  async findAll({ page = 1, limit = 20, search = null, isActive = null }) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== null) {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` u.is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await query(
      `SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.avatar_url,
              u.is_verified, u.is_active, u.last_login_at, u.created_at,
              r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return { users: result.rows, total };
  },
};

module.exports = userRepository;