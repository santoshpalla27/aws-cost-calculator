/**
 * User Controller
 * Handles HTTP requests for user-related endpoints
 */

const userService = require('../services/user.service');

const userController = {
  /**
   * GET /api/v1/users
   */
  async getUsers(req, res, next) {
    try {
      const result = await userService.getUsers(req.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/users/:id
   */
  async getUser(req, res, next) {
    try {
      const user = await userService.getUser(req.params.id);
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/users/profile
   */
  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/users/profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUser(req.user.id);
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = userController;