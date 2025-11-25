/**
 * Audit Repository
 * Data access layer for audit log operations
 */

const { query } = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const auditRepository = {
  /**
   * Create audit log entry
   */
  async create(adminId, action, entityType, entityId, oldValue, newValue, additionalInfo = {}, ipAddress = null, userAgent = null) {
    const id = generateUUID();
    const result = await query(
      `INSERT INTO admin_audit_logs (id, admin_id, action, entity_type, entity_id,
                                     old_value, new_value, additional_info, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, adminId, action, entityType, entityId,
       oldValue ? JSON.stringify(oldValue) : null,
       newValue ? JSON.stringify(newValue) : null,
       JSON.stringify(additionalInfo), ipAddress, userAgent]
    );

    return result.rows[0];
  },

  /**
   * Get audit logs with filters
   */
  async findAll(filters) {
    const {
      adminId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (adminId) {
      conditions.push(`al.admin_id = $${paramIndex}`);
      params.push(adminId);
      paramIndex++;
    }

    if (action) {
      conditions.push(`al.action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (entityType) {
      conditions.push(`al.entity_type = $${paramIndex}`);
      params.push(entityType);
      paramIndex++;
    }

    if (entityId) {
      conditions.push(`al.entity_id = $${paramIndex}`);
      params.push(entityId);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`al.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`al.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM admin_audit_logs al ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    params.push(limit, offset);
    const result = await query(
      `SELECT al.*, u.username as admin_username
       FROM admin_audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return { logs: result.rows, total };
  },

  /**
   * Get audit log by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT al.*, u.username as admin_username
       FROM admin_audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       WHERE al.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get recent activity for entity
   */
  async getEntityHistory(entityType, entityId, limit = 20) {
    const result = await query(
      `SELECT al.*, u.username as admin_username
       FROM admin_audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       WHERE al.entity_type = $1 AND al.entity_id = $2
       ORDER BY al.created_at DESC
       LIMIT $3`,
      [entityType, entityId, limit]
    );
    return result.rows;
  },
};

module.exports = auditRepository;