/**
 * User Routes
 */

const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate.middleware');
const { isOwnerOrAdmin, isAdmin } = require('../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 */
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 */
router.put('/profile', validateBody(/*Schema*/), userController.updateProfile);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (admin)
 *     tags: [Users, Admin]
 */
router.get('/', isAdmin, validateQuery(/*Schema*/), userController.getUsers);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID (admin)
 *     tags: [Users, Admin]
 */
router.get('/:id', isAdmin, validateParams(/*Schema*/), userController.getUser);

module.exports = router;