import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

export const authRoutes = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to the application
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 */
authRoutes.post('/login', 
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      if (result.success) {
        logger.info(`User login successful: ${email}`);
        res.json({
          token: result.token,
          user: result.user
        });
      } else {
        logger.warn(`Login failed for user: ${email}, reason: ${result.error}`);
        res.status(401).json({ error: result.error });
      }
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *     responses:
 *       200:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 */
authRoutes.post('/register', 
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').optional().isIn(['user', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, role } = req.body;

      const result = await AuthService.register(email, password, role || 'user');

      if (result.success) {
        logger.info(`User registration successful: ${email}`);
        res.status(201).json({
          token: result.token,
          user: result.user
        });
      } else {
        logger.warn(`Registration failed for user: ${email}, reason: ${result.error}`);
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default authRoutes;