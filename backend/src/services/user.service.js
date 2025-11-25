/**
 * User Service
 * Business logic for user operations
 */

const userRepository = require('../repositories/user.repository');
const { NotFoundError } = require('../utils/errors');
const { buildPaginationResponse } = require('../utils/helpers');

const userService = {
  /**
   * Get all users with filters
   */
  async getUsers(filters) {
    const { users, total } = await userRepository.findAll(filters);
    return buildPaginationResponse(users, total, filters.page, filters.limit);
  },

  /**
   * Get user by ID
   */
  async getUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    // Remove sensitive data
    delete user.password_hash;
    return user;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const user = await userRepository.update(userId, updates);
    if (!user) {
      throw new NotFoundError('User');
    }
    delete user.password_hash;
    return user;
  },
};

module.exports = userService;